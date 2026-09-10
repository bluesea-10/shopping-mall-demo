import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './OrderSuccess.css';

const PAYMENT_LABELS = {
  card: '신용카드',
  transfer: '계좌이체',
  kakao: '카카오페이',
  naver: '네이버페이',
};

function formatPrice(price) {
  return `₩${Number(price || 0).toLocaleString('ko-KR')}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order;

  useEffect(() => {
    if (!order) {
      navigate('/', { replace: true });
    }
  }, [order, navigate]);

  if (!order) {
    return <div className="order-success-page order-success-page--loading" />;
  }

  const items = order.items || [];
  const address = order.shippingAddress || {};
  const payment = order.payment || {};
  const pricing = order.pricing || {};

  return (
    <div className="order-success-page">
      <header className="order-success-topbar">
        <h1>Order Confirmation</h1>
      </header>

      <main className="order-success-main">
        <section className="order-success-hero">
          <div className="order-success-check" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M5 12.5 10 17.5 19 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2>주문이 성공적으로 완료되었습니다!</h2>
          <p>주문해 주셔서 감사합니다.</p>
          <p>주문 확인 이메일을 곧 받으실 수 있습니다.</p>
        </section>

        <section className="order-success-card">
          <div className="order-success-card-title">
            <span className="order-success-box-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M3 8.5 12 4l9 4.5v9L12 22 3 17.5v-9z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 22V13M3 8.5 12 13l9-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h3>주문 정보</h3>
          </div>

          <div className="order-success-meta">
            <div>
              <span className="order-success-label">주문 번호</span>
              <strong>{order.orderNumber || order._id}</strong>
            </div>
            <div>
              <span className="order-success-label">주문 날짜</span>
              <strong>{formatDate(order.createdAt)}</strong>
            </div>
          </div>

          <div className="order-success-section">
            <h4>주문 상품</h4>
            <ul className="order-success-items">
              {items.map((item) => {
                const product = item.product || {};
                return (
                  <li key={item._id || `${product._id}-${item.size}`}>
                    <div className="order-success-thumb">
                      {product.image ? (
                        <img src={product.image} alt={product.name || ''} />
                      ) : (
                        <span />
                      )}
                    </div>
                    <div className="order-success-item-copy">
                      <p className="order-success-item-name">
                        {product.name || '상품'}
                      </p>
                      <p className="order-success-item-meta">
                        {[item.size, product.category, `수량 ${item.quantity}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="order-success-item-price">
                        {formatPrice(
                          Number(product.price || 0) * Number(item.quantity || 0)
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="order-success-section">
            <h4>배송지</h4>
            <div className="order-success-info-block">
              <p>
                <strong>{address.recipient || '-'}</strong>
                {address.phone ? ` · ${address.phone}` : ''}
              </p>
              <p>
                {[address.address, address.detailAddress, address.postalCode]
                  .filter(Boolean)
                  .join(' ') || '-'}
              </p>
            </div>
          </div>

          <div className="order-success-section">
            <h4>결제 정보</h4>
            <div className="order-success-info-block">
              <p>
                결제수단:{' '}
                <strong>
                  {PAYMENT_LABELS[payment.method] || payment.method || '-'}
                </strong>
              </p>
              <p>
                결제상태: <strong>{payment.status === 'paid' ? '결제완료' : payment.status || '-'}</strong>
              </p>
              {payment.impUid ? <p>결제번호: {payment.impUid}</p> : null}
              <p className="order-success-total">
                총 결제금액 <strong>{formatPrice(pricing.total)}</strong>
              </p>
            </div>
          </div>
        </section>

        <div className="order-success-actions">
          <Link to="/orders" className="order-success-orders-btn">
            주문 목록 보기
          </Link>
          <Link to="/" className="order-success-home-btn">
            쇼핑 계속하기
          </Link>
        </div>
      </main>
    </div>
  );
}

export default OrderSuccess;
