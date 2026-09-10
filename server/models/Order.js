const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, '수량은 1개 이상이어야 합니다.'],
    },
    size: {
      type: String,
      trim: true,
      enum: {
        values: ['SMALL', 'BIG'],
        message: '사이즈는 SMALL, BIG 중 하나여야 합니다.',
      },
    },
  },
  {
    _id: true,
  }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    detailAddress: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: {
        values: ['card', 'transfer', 'kakao', 'naver'],
        message: '결제 수단은 card, transfer, kakao, naver 중 하나여야 합니다.',
      },
      default: 'card',
    },
    status: {
      type: String,
      enum: {
        values: ['ready', 'paid', 'failed', 'refunded'],
        message: '결제 상태는 ready, paid, failed, refunded 중 하나여야 합니다.',
      },
      default: 'paid',
    },
    paidAt: {
      type: Date,
    },
    impUid: {
      type: String,
      trim: true,
      index: true,
    },
    merchantUid: {
      type: String,
      trim: true,
      index: true,
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    subtotal: {
      type: Number,
      required: true,
      min: [0, '상품 합계는 0 이상이어야 합니다.'],
    },
    shippingFee: {
      type: Number,
      required: true,
      min: [0, '배송비는 0 이상이어야 합니다.'],
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: [0, '총 결제금액은 0 이상이어야 합니다.'],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: '주문 상품이 최소 1개 이상이어야 합니다.',
      },
    },
    status: {
      type: String,
      enum: {
        values: [
          'confirmed',
          'preparing',
          'ship_start',
          'shipping',
          'delivered',
          'cancelled',
          // 하위 호환 (기존 데이터)
          'pending',
          'paid',
        ],
        message:
          '주문 상태는 confirmed, preparing, ship_start, shipping, delivered, cancelled 중 하나여야 합니다.',
      },
      default: 'confirmed',
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    payment: {
      type: paymentSchema,
      default: () => ({ method: 'card', status: 'paid', paidAt: new Date() }),
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    memo: {
      type: String,
      trim: true,
      maxlength: [500, '배송 요청사항은 500자 이하여야 합니다.'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
