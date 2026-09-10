import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createOrder,
  getCart,
  getCheckoutDefaults,
  getMe,
  getStoredToken,
} from '../api/client';
import { notifyCartUpdated } from '../hooks/useCartCount';
import './Checkout.css';

const STEPS = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
];

const PAYMENT_OPTIONS = [
  { value: 'card', label: '신용카드' },
  { value: 'transfer', label: '계좌이체' },
  { value: 'kakao', label: '카카오페이' },
  { value: 'naver', label: '네이버페이' },
];

const PAYMENT_LABELS = Object.fromEntries(
  PAYMENT_OPTIONS.map((option) => [option.value, option.label])
);

const PORTONE_IMP_CODE =
  import.meta.env.VITE_PORTONE_IMP_CODE || 'imp50650778';

/** 포트원 콘솔 > 결제 연동 > 채널 관리 */
const PORTONE_CHANNEL_KEY =
  import.meta.env.VITE_PORTONE_CHANNEL_KEY ||
  'channel-key-5825b156-536a-42fb-9226-4ecf46ecd372';

/**
 * 채널 상세의 "PG사" / PG Provider 코드
 * 예: tosspayments, nice_v2, kcp, html5_inicis, kakaopay
 * (채널키만 넘기면 구버전 SDK에서 pg 오류가 날 수 있음)
 */
const PORTONE_PG = import.meta.env.VITE_PORTONE_PG || 'tosspayments';

function formatPrice(price) {
  return `₩${Number(price || 0).toLocaleString('ko-KR')}`;
}

function getIamport() {
  if (typeof window === 'undefined') return null;
  return window.IMP || null;
}

function buildOrderName(items) {
  const firstName = items[0]?.product?.name || 'POKETMON LAND 주문';
  if (items.length <= 1) return firstName;
  return `${firstName} 외 ${items.length - 1}건`;
}

function Checkout() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    paymentMethod: 'card',
    memo: '',
  });

  useEffect(() => {
    const IMP = getIamport();

    if (!IMP) {
      console.warn('포트원(Iamport) 스크립트가 로드되지 않았습니다.');
      return;
    }

    IMP.init(PORTONE_IMP_CODE);
  }, []);

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login', { replace: true });
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [cartData, defaultsData, meData] = await Promise.all([
          getCart(),
          getCheckoutDefaults().catch(() => null),
          getMe().catch(() => null),
        ]);

        if (cancelled) return;

        const nextItems = cartData.cart?.items || [];
        if (nextItems.length === 0) {
          navigate('/cart', { replace: true });
          return;
        }

        setCart(cartData.cart);

        const recipient = defaultsData?.defaults?.recipient || '';
        const nameParts = recipient.trim().split(/\s+/).filter(Boolean);

        setForm((prev) => ({
          ...prev,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: meData?.user?.email || meData?.email || '',
          phone: defaultsData?.defaults?.phone || '',
          address: defaultsData?.defaults?.address || '',
          city: defaultsData?.defaults?.detailAddress || '',
          postalCode: defaultsData?.defaults?.postalCode || '',
        }));
      } catch (err) {
        if (!cancelled) {
          if (err.status === 401) {
            navigate('/login', { replace: true });
            return;
          }
          setError(err.message || '주문 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const items = cart?.items || [];

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price = Number(item.product?.price || 0);
        return sum + price * Number(item.quantity || 0);
      }, 0),
    [items]
  );

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const validateShipping = () => {
    if (!form.firstName.trim() || !form.phone.trim() || !form.address.trim()) {
      alert('이름, 연락처, 주소를 모두 입력해 주세요.');
      return false;
    }
    return true;
  };

  const completeOrder = async (paymentResult, orderDraft) => {
    const data = await createOrder({
      shippingAddress: orderDraft.shippingAddress,
      payment: {
        method: orderDraft.paymentMethod,
        status: 'paid',
        impUid: paymentResult?.imp_uid,
        merchantUid: paymentResult?.merchant_uid,
      },
      memo: orderDraft.memo,
      items: orderDraft.items,
    });

    notifyCartUpdated(data.cart || { items: [] });
    navigate('/order/success', {
      replace: true,
      state: { order: data.order },
    });
  };

  const handlePlaceOrder = () => {
    if (submitting) return;
    if (!validateShipping()) {
      setStep(0);
      return;
    }

    if (!items.length || subtotal <= 0) {
      alert('결제할 상품이 없습니다.');
      return;
    }

    const IMP = getIamport();
    if (!IMP) {
      alert('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      return;
    }

    IMP.init(PORTONE_IMP_CODE);

    const recipient = [form.firstName, form.lastName]
      .map((v) => v.trim())
      .filter(Boolean)
      .join(' ');
    const merchantUid = `payment-${Date.now()}`;

    // 결제 중 화면이 리마운트되어도 쓰도록 주문 초안을 콜백에 고정
    const orderDraft = {
      shippingAddress: {
        recipient,
        phone: form.phone.trim(),
        address: form.address.trim(),
        detailAddress: form.city.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
      },
      paymentMethod: form.paymentMethod || 'card',
      memo: form.memo.trim() || undefined,
      items: items.map((item) => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity,
        size: item.size || undefined,
      })),
    };

    setSubmitting(true);

    const payRequest = {
      channelKey: PORTONE_CHANNEL_KEY,
      pg: PORTONE_PG,
      pay_method: 'card',
      merchant_uid: merchantUid,
      name: buildOrderName(items),
      amount: Number(subtotal),
      buyer_email: form.email.trim() || 'buyer@example.com',
      buyer_name: recipient || '구매자',
      buyer_tel: form.phone.trim() || '010-0000-0000',
      buyer_addr:
        [form.address.trim(), form.city.trim()].filter(Boolean).join(' ') ||
        '주소 미입력',
      buyer_postcode: form.postalCode.trim() || '00000',
      m_redirect_url: `${window.location.origin}/checkout`,
    };

    console.log('[PortOne] request_pay', payRequest);

    IMP.request_pay(payRequest, async function (rsp) {
      try {
        const isPaid =
          Boolean(rsp?.imp_uid) &&
          rsp?.success !== false &&
          (rsp?.error_code == null || rsp?.error_code === '');

        if (!isPaid) {
          const msg = rsp?.error_msg || '결제가 취소되었거나 실패했습니다.';
          if (String(msg).includes('pg')) {
            alert(
              `${msg}\n\n포트원 콘솔 → 채널 관리 → 해당 채널의 PG사 코드를 확인한 뒤\nclient/.env 의 VITE_PORTONE_PG 값을 그 코드로 바꿔 주세요.\n(예: tosspayments, nice_v2, kcp, html5_inicis)\n현재 값: ${PORTONE_PG}`
            );
          } else {
            alert(msg);
          }
          return;
        }

        await completeOrder(rsp, orderDraft);
      } catch (err) {
        if (err.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
    alert(
      `${err.message || '주문 저장에 실패했습니다.'}\n\n결제는 승인되었을 수 있습니다.\n결제번호(imp_uid): ${rsp?.imp_uid || '-'}\n주문번호(merchant_uid): ${rsp?.merchant_uid || '-'}\n포트원 콘솔에서 결제 내역을 확인해 주세요.`
    );
      } finally {
        setSubmitting(false);
      }
    });
  };

  const goNext = () => {
    if (step === 0 && !validateShipping()) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    if (step === 0) {
      navigate('/cart');
      return;
    }
    setStep((prev) => Math.max(prev - 1, 0));
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <p className="checkout-status">주문 페이지를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkout-page">
        <p className="checkout-status checkout-status--error">{error}</p>
        <Link to="/cart" className="checkout-back-link">
          장바구니로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <header className="checkout-topbar">
        <button
          type="button"
          className="checkout-back-btn"
          onClick={goBack}
          aria-label="뒤로 가기"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15.5 5.5 9 12l6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1>Checkout</h1>
        <span className="checkout-topbar-spacer" />
      </header>

      <div className="checkout-stepper" aria-label="주문 단계">
        {STEPS.map((item, index) => {
          const active = index === step;
          const done = index < step;

          return (
            <div key={item.id} className="checkout-step-wrap">
              {index > 0 ? <span className="checkout-step-line" /> : null}
              <div
                className={`checkout-step ${active ? 'is-active' : ''} ${
                  done ? 'is-done' : ''
                }`}
              >
                <span className="checkout-step-number">{index + 1}</span>
                <span className="checkout-step-label">{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <main className="checkout-main">
        <section className="checkout-form-panel">
          {step === 0 ? (
            <>
              <div className="checkout-section-title">
                <span className="checkout-section-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <circle cx="7" cy="17.5" r="1.5" fill="currentColor" />
                    <circle cx="17" cy="17.5" r="1.5" fill="currentColor" />
                  </svg>
                </span>
                <h2>Shipping Information</h2>
              </div>

              <div className="checkout-grid checkout-grid--2">
                <label className="checkout-field">
                  <span>First Name</span>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    placeholder="John"
                    autoComplete="given-name"
                  />
                </label>
                <label className="checkout-field">
                  <span>Last Name</span>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                    placeholder="Doe"
                    autoComplete="family-name"
                  />
                </label>
              </div>

              <label className="checkout-field">
                <span>Email</span>
                <div className="checkout-input-with-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M4 6h16v12H4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="m4 7 8 6 8-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="john@example.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="checkout-field">
                <span>Phone Number</span>
                <div className="checkout-input-with-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M7 3h3l1.5 4-2 1.5a12 12 0 0 0 5 5L16 12l4 1.5V17a2 2 0 0 1-2 2A14 14 0 0 1 5 5a2 2 0 0 1 2-2z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="010-0000-0000"
                    autoComplete="tel"
                  />
                </div>
              </label>

              <label className="checkout-field">
                <span>Address</span>
                <div className="checkout-input-with-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="12"
                      cy="10"
                      r="2.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                  <input
                    type="text"
                    value={form.address}
                    onChange={handleChange('address')}
                    placeholder="123 Main Street"
                    autoComplete="street-address"
                  />
                </div>
              </label>

              <div className="checkout-grid checkout-grid--city">
                <label className="checkout-field">
                  <span>City</span>
                  <input
                    type="text"
                    value={form.city}
                    onChange={handleChange('city')}
                    placeholder="New York"
                    autoComplete="address-level2"
                  />
                </label>
                <label className="checkout-field">
                  <span>ZIP Code</span>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={handleChange('postalCode')}
                    placeholder="10001"
                    autoComplete="postal-code"
                  />
                </label>
              </div>

              <section className="checkout-choice-section">
                <div className="checkout-section-title">
                  <span className="checkout-section-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <circle cx="7" cy="17.5" r="1.5" fill="currentColor" />
                      <circle cx="17" cy="17.5" r="1.5" fill="currentColor" />
                    </svg>
                  </span>
                  <h2>배송 방법</h2>
                </div>

                <div className="checkout-delivery-option is-selected">
                  <div>
                    <p className="checkout-delivery-name">일반 배송</p>
                    <p className="checkout-delivery-desc">3-5 영업일</p>
                  </div>
                  <span className="checkout-delivery-price">무료</span>
                </div>
              </section>

              <section className="checkout-choice-section">
                <div className="checkout-section-title">
                  <span className="checkout-section-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M3 10h18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </span>
                  <h2>결제 정보</h2>
                </div>

                <div className="checkout-payment-options">
                  {PAYMENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`checkout-payment-option ${
                        form.paymentMethod === option.value ? 'is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={form.paymentMethod === option.value}
                        onChange={handleChange('paymentMethod')}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="checkout-section-title">
                <h2>Payment</h2>
              </div>
              <label className="checkout-field">
                <span>배송 요청사항 (선택)</span>
                <textarea
                  value={form.memo}
                  onChange={handleChange('memo')}
                  placeholder="배송 시 요청사항을 입력해 주세요"
                  rows={3}
                />
              </label>
              <button type="button" className="checkout-next-btn" onClick={goNext}>
                Continue to Review
              </button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="checkout-section-title">
                <h2>Review</h2>
              </div>
              <div className="checkout-review-card">
                <p>
                  <strong>Recipient</strong>
                  <span>
                    {[form.firstName, form.lastName].filter(Boolean).join(' ')}
                  </span>
                </p>
                <p>
                  <strong>Contact</strong>
                  <span>
                    {form.email}
                    {form.email && form.phone ? ' · ' : ''}
                    {form.phone}
                  </span>
                </p>
                <p>
                  <strong>Address</strong>
                  <span>
                    {[form.address, form.city, form.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </p>
                <p>
                  <strong>Delivery</strong>
                  <span>일반 배송 · 3-5 영업일 · 무료</span>
                </p>
                <p>
                  <strong>Payment</strong>
                  <span>{PAYMENT_LABELS[form.paymentMethod] || form.paymentMethod}</span>
                </p>
                {form.memo ? (
                  <p>
                    <strong>Note</strong>
                    <span>{form.memo}</span>
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </section>

        <aside className="checkout-summary">
          <h2>Order Summary</h2>

          <ul className="checkout-summary-items">
            {items.map((item) => {
              const product = item.product || {};
              const unitPrice = Number(product.price || 0);

              return (
                <li key={item._id} className="checkout-summary-item">
                  <div className="checkout-summary-thumb">
                    {product.image ? (
                      <img src={product.image} alt={product.name || ''} />
                    ) : (
                      <span />
                    )}
                    <span className="checkout-qty-badge">{item.quantity}</span>
                  </div>
                  <div className="checkout-summary-copy">
                    <p className="checkout-summary-name">
                      {product.name || '삭제된 상품'}
                    </p>
                    <p className="checkout-summary-meta">
                      {[item.size, product.category].filter(Boolean).join(' · ') ||
                        product.sku ||
                        '-'}
                    </p>
                    <p className="checkout-summary-price">
                      {formatPrice(unitPrice)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="checkout-summary-rows">
            <div className="checkout-summary-row">
              <span>Subtotal ({totalQuantity} items)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="checkout-summary-row">
              <span>Shipping</span>
              <span className="checkout-shipping-free">FREE</span>
            </div>
            <div className="checkout-summary-row">
              <span>Tax</span>
              <span>{formatPrice(0)}</span>
            </div>
            <div className="checkout-summary-row checkout-summary-row--total">
              <span>Total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="checkout-place-btn"
            disabled={submitting}
            onClick={handlePlaceOrder}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8 10V8a4 4 0 0 1 8 0v2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            {submitting ? 'Processing...' : 'PLACE ORDER'}
          </button>

          <p className="checkout-secure">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M8 10V8a4 4 0 0 1 8 0v2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
            Secure SSL encrypted checkout
          </p>

          <div className="checkout-pay-logos" aria-hidden="true">
            <span>VISA</span>
            <span>MC</span>
            <span>AMEX</span>
            <span>PAYPAL</span>
          </div>

          <p className="checkout-legal">
            By placing your order, you agree to our Terms of Service and Privacy
            Policy.
          </p>
        </aside>
      </main>
    </div>
  );
}

export default Checkout;
