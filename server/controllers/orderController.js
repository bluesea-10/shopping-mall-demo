const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product');

const ORDER_STATUSES = [
  'confirmed',
  'preparing',
  'ship_start',
  'shipping',
  'delivered',
  'cancelled',
];
const ORDER_STATUS_MESSAGE =
  '주문 상태는 주문확인, 상품 준비중, 배송시작, 배송중, 배송 완료, 주문 취소 중 하나여야 합니다.';

const PAYMENT_METHODS = ['card', 'transfer', 'kakao', 'naver'];

const populateOrder = (query) =>
  query
    .populate('user', 'name email address')
    .populate('items.product');

const createOrderNumber = async () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const prefix = `ORD-${y}${m}${d}`;

  const count = await Order.countDocuments({
    orderNumber: new RegExp(`^${prefix}`),
  });

  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

/** 동일 impUid / merchantUid 주문이 이미 있는지 확인 */
const findDuplicatePaidOrder = async ({ impUid, merchantUid }) => {
  const conditions = [];

  if (impUid) {
    conditions.push({ 'payment.impUid': impUid });
  }
  if (merchantUid) {
    conditions.push({ 'payment.merchantUid': merchantUid });
  }

  if (conditions.length === 0) {
    return null;
  }

  return Order.findOne({ $or: conditions }).populate('user', 'name email');
};

/** 포트원 에러 메시지에서 키/시크릿 노출 제거 */
const sanitizePortOneMessage = (message) => {
  const text = String(message || '');

  if (/API키|secret|인증에 실패/i.test(text)) {
    return '포트원 API 인증에 실패했습니다. server/.env 의 PORTONE_API_KEY / PORTONE_API_SECRET 값을 콘솔에서 다시 복사해 넣어 주세요.';
  }

  return text
    .replace(/imp_key["']?\s*[:=]\s*["']?[^"',\s]+/gi, 'imp_key=***')
    .replace(/imp_secret["']?\s*[:=]\s*["']?[^"',\s]+/gi, 'imp_secret=***')
    .replace(/\b\d{10,20}\b/g, (match) =>
      match === String(process.env.PORTONE_API_KEY || '').trim() ? '***' : match
    );
};

/** 포트원 액세스 토큰 발급 */
const getPortOneAccessToken = async () => {
  const impKey = String(process.env.PORTONE_API_KEY || '').trim();
  const impSecret = String(process.env.PORTONE_API_SECRET || '').trim();

  if (!impKey || !impSecret) {
    const error = new Error(
      'PORTONE_API_KEY / PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.'
    );
    error.status = 500;
    throw error;
  }

  const response = await fetch('https://api.iamport.kr/users/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imp_key: impKey,
      imp_secret: impSecret,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.code !== 0 || !data.response?.access_token) {
    console.error('[PortOne] getToken failed:', {
      status: response.status,
      code: data.code,
    });
    const error = new Error(
      sanitizePortOneMessage(
        data.message || '포트원 액세스 토큰 발급에 실패했습니다.'
      )
    );
    error.status = 502;
    throw error;
  }

  return data.response.access_token;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 포트원 결제 단건 조회 (imp_uid) */
const fetchPaymentByImpUid = async (impUid, accessToken) => {
  const response = await fetch(
    `https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`,
    {
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  return { response, data };
};

/** 포트원 결제 조회 (merchant_uid + status) */
const fetchPaymentByMerchantUid = async (
  merchantUid,
  accessToken,
  status = 'paid'
) => {
  const response = await fetch(
    `https://api.iamport.kr/payments/find/${encodeURIComponent(merchantUid)}/${encodeURIComponent(status)}`,
    {
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  return { response, data };
};

/**
 * 포트원 결제 단건 조회 + 금액/상태/주문번호 검증
 * 결제 직후 동기화 지연을 고려해 재시도하고, merchant_uid 조회로 fallback
 * @returns {Promise<object>} 포트원 payment 객체
 */
const verifyPortOnePayment = async ({
  impUid,
  merchantUid,
  expectedAmount,
}) => {
  if (!impUid && !merchantUid) {
    const error = new Error('결제 번호(imp_uid) 또는 주문번호(merchant_uid)가 필요합니다.');
    error.status = 400;
    throw error;
  }

  const accessToken = await getPortOneAccessToken();

  let paymentInfo = null;
  let lastMessage = '포트원 결제 내역을 조회하지 못했습니다.';

  // 1) imp_uid 조회로 최대 5회 재시도 (결제 직후 지연 대응)
  if (impUid) {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const { data } = await fetchPaymentByImpUid(impUid, accessToken);

      if (data.code === 0 && data.response) {
        paymentInfo = data.response;
        break;
      }

      lastMessage = data.message || lastMessage;
      console.warn('[PortOne] payment lookup retry', {
        attempt,
        impUid,
        code: data.code,
        message: data.message,
      });

      if (attempt < 5) {
        await sleep(800 * attempt);
      }
    }
  }

  // 2) 그래도 없으면 merchant_uid 로 조회
  if (!paymentInfo && merchantUid) {
    const { data } = await fetchPaymentByMerchantUid(
      merchantUid,
      accessToken,
      'paid'
    );

    if (data.code === 0 && data.response) {
      paymentInfo = data.response;
    } else {
      lastMessage = data.message || lastMessage;
      console.warn('[PortOne] merchant_uid lookup failed', {
        merchantUid,
        code: data.code,
        message: data.message,
      });
    }
  }

  if (!paymentInfo) {
    const error = new Error(sanitizePortOneMessage(lastMessage));
    error.status = 502;
    throw error;
  }

  if (paymentInfo.status !== 'paid') {
    const error = new Error(
      `결제가 완료되지 않았습니다. (상태: ${paymentInfo.status})`
    );
    error.status = 400;
    throw error;
  }

  if (
    merchantUid &&
    paymentInfo.merchant_uid &&
    String(paymentInfo.merchant_uid) !== String(merchantUid)
  ) {
    const error = new Error(
      '주문번호(merchant_uid)가 결제 정보와 일치하지 않습니다.'
    );
    error.status = 400;
    throw error;
  }

  if (
    impUid &&
    paymentInfo.imp_uid &&
    String(paymentInfo.imp_uid) !== String(impUid)
  ) {
    const error = new Error('결제번호(imp_uid)가 결제 정보와 일치하지 않습니다.');
    error.status = 400;
    throw error;
  }

  const paidAmount = Number(paymentInfo.amount);
  if (Number(expectedAmount) !== paidAmount) {
    const error = new Error(
      `결제 금액이 일치하지 않습니다. (요청: ${expectedAmount}, 결제: ${paidAmount})`
    );
    error.status = 400;
    throw error;
  }

  return paymentInfo;
};

/** POST /api/orders - 주문 생성 (결제 완료 후) */
const createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, payment, memo, items: bodyItems } = req.body || {};

    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return res.status(400).json({ message: '배송지 정보가 필요합니다.' });
    }

    const recipient = String(shippingAddress.recipient || '').trim();
    const phone = String(shippingAddress.phone || '').trim();
    const address = String(shippingAddress.address || '').trim();
    const detailAddress = String(shippingAddress.detailAddress || '').trim();
    const postalCode = String(shippingAddress.postalCode || '').trim();

    if (!recipient || !phone || !address) {
      return res.status(400).json({
        message: '수령인, 연락처, 주소는 필수입니다.',
      });
    }

    const method = payment?.method || 'card';
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({
        message: '결제 수단은 card, transfer, kakao, naver 중 하나여야 합니다.',
      });
    }

    const impUid = payment?.impUid ? String(payment.impUid).trim() : '';
    const merchantUid = payment?.merchantUid
      ? String(payment.merchantUid).trim()
      : '';

    if (!impUid) {
      return res.status(400).json({
        message: '결제 검증을 위해 impUid가 필요합니다.',
      });
    }

    // 1) 주문 중복 여부 체크 (동일 결제/상점주문번호)
    const duplicated = await findDuplicatePaidOrder({ impUid, merchantUid });
    if (duplicated) {
      return res.status(409).json({
        message: '이미 처리된 결제입니다. 중복 주문이 생성되지 않았습니다.',
        order: duplicated,
      });
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product'
    );

    // 결제 직후 장바구니가 비는 레이스에 대비해, 클라이언트가 보낸 items를 우선 사용
    let sourceItems = [];

    if (Array.isArray(bodyItems) && bodyItems.length > 0) {
      sourceItems = bodyItems.map((item) => ({
        productId: item.productId || item.product,
        quantity: item.quantity,
        size: item.size,
      }));
    } else if (cart?.items?.length) {
      sourceItems = cart.items.map((item) => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity,
        size: item.size,
      }));
    }

    if (sourceItems.length === 0) {
      return res.status(400).json({
        message:
          '주문할 상품이 없습니다. 결제는 완료되었을 수 있으니 고객센터로 문의해 주세요.',
      });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of sourceItems) {
      const productId = item.productId;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: '올바른 상품 정보가 필요합니다.' });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({
          message: '주문에 삭제된 상품이 포함되어 있습니다.',
        });
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: '잘못된 수량이 있습니다.' });
      }

      const size =
        item.size === 'SMALL' || item.size === 'BIG' ? item.size : undefined;

      subtotal += Number(product.price || 0) * quantity;
      orderItems.push({
        product: product._id,
        quantity,
        size,
      });
    }

    const shippingFee = 0;
    const total = subtotal + shippingFee;

    // 2) 포트원 결제 검증 (상태 paid + 금액 + merchant_uid)
    let verifiedPayment;
    try {
      verifiedPayment = await verifyPortOnePayment({
        impUid,
        merchantUid,
        expectedAmount: total,
      });
    } catch (verifyError) {
      return res.status(verifyError.status || 400).json({
        message: verifyError.message || '결제 검증에 실패했습니다.',
      });
    }

    const orderNumber = await createOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: req.user.id,
      items: orderItems,
      status: 'confirmed',
      shippingAddress: {
        recipient,
        phone,
        address,
        detailAddress: detailAddress || undefined,
        postalCode: postalCode || undefined,
      },
      payment: {
        method,
        status: 'paid',
        paidAt: verifiedPayment.paid_at
          ? new Date(verifiedPayment.paid_at * 1000)
          : new Date(),
        impUid,
        merchantUid: merchantUid || verifiedPayment.merchant_uid || undefined,
      },
      pricing: {
        subtotal,
        shippingFee,
        total,
      },
      memo: memo ? String(memo).trim() : undefined,
    });

    if (cart) {
      cart.items = [];
      await cart.save();
    }

    const populated = await populateOrder(Order.findById(order._id));

    return res.status(201).json({
      message: '주문이 완료되었습니다.',
      order: populated,
      cart: cart || { items: [] },
      payment: {
        impUid,
        merchantUid: order.payment.merchantUid,
        amount: verifiedPayment.amount,
        status: verifiedPayment.status,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        message: firstError?.message || error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: '이미 처리된 주문이거나 주문번호가 중복되었습니다.',
      });
    }

    return next(error);
  }
};

/** GET /api/orders - 내 주문 목록 */
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await populateOrder(
      Order.find({ user: req.user.id }).sort({ createdAt: -1 })
    );

    return res.json({ orders });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/orders/admin - 전체 주문 목록 (관리자) */
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await populateOrder(Order.find().sort({ createdAt: -1 }));
    return res.json({ orders });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/orders/:id - 주문 상세 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '올바른 주문 ID가 필요합니다.' });
    }

    const order = await populateOrder(Order.findById(id));

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    const isOwner = String(order.user?._id || order.user) === String(req.user.id);
    const isAdmin = req.user.user_type === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '이 주문에 접근할 수 없습니다.' });
    }

    return res.json({ order });
  } catch (error) {
    return next(error);
  }
};

const normalizeShippingAddress = (shippingAddress) => {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return null;
  }

  const recipient = String(shippingAddress.recipient || '').trim();
  const phone = String(shippingAddress.phone || '').trim();
  const address = String(shippingAddress.address || '').trim();
  const detailAddress = String(shippingAddress.detailAddress || '').trim();
  const postalCode = String(shippingAddress.postalCode || '').trim();

  if (!recipient || !phone || !address) {
    return { error: '수령인, 연락처, 주소는 필수입니다.' };
  }

  return {
    value: {
      recipient,
      phone,
      address,
      detailAddress: detailAddress || undefined,
      postalCode: postalCode || undefined,
    },
  };
};

/** PATCH /api/orders/:id/status - 주문 상태 변경 (관리자) */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '올바른 주문 ID가 필요합니다.' });
    }

    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        message: ORDER_STATUS_MESSAGE,
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    order.status = status;
    await order.save();

    const populated = await populateOrder(Order.findById(order._id));

    return res.json({
      message: '주문 상태가 변경되었습니다.',
      order: populated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        message: firstError?.message || error.message,
      });
    }

    return next(error);
  }
};

/** PUT /api/orders/:id - 주문 수정 (관리자) */
const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, shippingAddress, payment, memo } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '올바른 주문 ID가 필요합니다.' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    if (status !== undefined) {
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          message: ORDER_STATUS_MESSAGE,
        });
      }
      order.status = status;
    }

    if (shippingAddress !== undefined) {
      const normalized = normalizeShippingAddress(shippingAddress);
      if (!normalized) {
        return res.status(400).json({ message: '배송지 정보가 필요합니다.' });
      }
      if (normalized.error) {
        return res.status(400).json({ message: normalized.error });
      }
      order.shippingAddress = normalized.value;
    }

    if (payment !== undefined) {
      if (payment.method !== undefined) {
        if (!PAYMENT_METHODS.includes(payment.method)) {
          return res.status(400).json({
            message: '결제 수단은 card, transfer, kakao, naver 중 하나여야 합니다.',
          });
        }
        order.payment.method = payment.method;
      }

      if (payment.status !== undefined) {
        const paymentStatuses = ['ready', 'paid', 'failed', 'refunded'];
        if (!paymentStatuses.includes(payment.status)) {
          return res.status(400).json({
            message: '결제 상태는 ready, paid, failed, refunded 중 하나여야 합니다.',
          });
        }
        order.payment.status = payment.status;
        if (payment.status === 'paid' && !order.payment.paidAt) {
          order.payment.paidAt = new Date();
        }
      }
    }

    if (memo !== undefined) {
      order.memo = memo ? String(memo).trim() : undefined;
    }

    await order.save();

    const populated = await populateOrder(Order.findById(order._id));

    return res.json({
      message: '주문이 수정되었습니다.',
      order: populated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        message: firstError?.message || error.message,
      });
    }

    return next(error);
  }
};

/** DELETE /api/orders/:id - 주문 삭제 (관리자) */
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '올바른 주문 ID가 필요합니다.' });
    }

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    return res.json({
      message: '주문이 삭제되었습니다.',
      order,
    });
  } catch (error) {
    return next(error);
  }
};

/** 배송지 기본값용 유저 정보 */
const getCheckoutDefaults = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('name email address');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.json({
      defaults: {
        recipient: user.name || '',
        phone: '',
        address: user.address || '',
        detailAddress: '',
        postalCode: '',
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getCheckoutDefaults,
};
