import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyOrders, getStoredToken } from '../api/client';
import './OrderSuccess.css';

const PAYMENT_LABELS = {
  card: '신용카드',
  transfer: '계좌이체',
  kakao: '카카오페이',
  naver: '네이버페이',
};

/** Order.js 배송/주문 상태 */
const STATUS_TABS = [
  { value: 'all', label: '전체' },
  { value: 'confirmed', label: '주문확인' },
  { value: 'preparing', label: '상품 준비중' },
  { value: 'ship_start', label: '배송시작' },
  { value: 'shipping', label: '배송중' },
  { value: 'delivered', label: '배송 완료' },
  { value: 'cancelled', label: '주문 취소' },
];

const STATUS_LABELS = {
  confirmed: '주문확인',
  preparing: '상품 준비중',
  ship_start: '배송시작',
  shipping: '배송중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
  // 하위 호환
  pending: '주문확인',
  paid: '주문확인',
};

function normalizeStatus(status) {
  if (status === 'paid' || status === 'pending') return 'confirmed';
  return status;
}

function formatPrice(price) {
  return `₩${Number(price || 0).toLocaleString('ko-KR')}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [statusTab, setStatusTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        const data = await getMyOrders();
        if (!cancelled) setOrders(data.orders || []);
      } catch (err) {
        if (!cancelled) {
          if (err.status === 401) {
            navigate('/login', { replace: true });
            return;
          }
          setError(err.message || '주문 목록을 불러오지 못했습니다.');
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

  const statusCounts = useMemo(() => {
    const counts = { all: orders.length };
    for (const tab of STATUS_TABS) {
      if (tab.value === 'all') continue;
      counts[tab.value] = orders.filter(
        (order) => normalizeStatus(order.status) === tab.value
      ).length;
    }
    return counts;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (statusTab === 'all') return orders;
    return orders.filter(
      (order) => normalizeStatus(order.status) === statusTab
    );
  }, [orders, statusTab]);
  return (
    <div className="order-success-page">
      <Navbar />
      <main className="order-success-main">
        <header className="order-success-topbar">
          <h1>My Orders</h1>
        </header>

        {!loading && !error ? (
          <div className="my-orders-tabs" role="tablist" aria-label="주문 상태">
            {STATUS_TABS.map((tab) => {
              const count = statusCounts[tab.value] || 0;
              const isActive = statusTab === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`my-orders-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => setStatusTab(tab.value)}
                >
                  <span>{tab.label}</span>
                  <em>{count}</em>
                </button>
              );
            })}
          </div>
        ) : null}

        {loading ? (
          <p className="home-products-status">주문 목록을 불러오는 중...</p>
        ) : error ? (
          <p className="home-products-status home-products-status--error">
            {error}
          </p>
        ) : orders.length === 0 ? (
          <div className="order-success-card">
            <p>아직 주문이 없습니다.</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="order-success-card">
            <p>
              {STATUS_LABELS[statusTab] || statusTab} 상태의 주문이 없습니다.
            </p>
          </div>
        ) : (
          <ul className="my-orders-list">
            {visibleOrders.map((order) => {
              const items = order.items || [];

              return (
                <li key={order._id} className="order-success-card my-orders-item">
                  <div className="order-success-meta">
                    <div>
                      <span className="order-success-label">주문 번호</span>
                      <strong>{order.orderNumber}</strong>
                    </div>
                    <div>
                      <span className="order-success-label">주문 날짜</span>
                      <strong>{formatDate(order.createdAt)}</strong>
                    </div>
                  </div>

                  <ul className="my-orders-items">
                    {items.map((item) => {
                      const product = item.product || {};
                      const unitPrice = Number(product.price || 0);
                      const quantity = Number(item.quantity || 0);
                      const lineTotal = unitPrice * quantity;

                      return (
                        <li
                          key={item._id || `${product._id}-${item.size}`}
                          className="my-orders-product"
                        >
                          <div className="my-orders-thumb">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name || '상품'}
                              />
                            ) : (
                              <span className="my-orders-thumb-empty" />
                            )}
                          </div>
                          <div className="my-orders-product-copy">
                            <p className="my-orders-product-name">
                              {product.name || '삭제된 상품'}
                            </p>
                            <p className="my-orders-product-meta">
                              {[
                                item.size,
                                product.category,
                                `수량 ${quantity}`,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                            <p className="my-orders-product-price">
                              {formatPrice(lineTotal)}
                              {quantity > 1 ? (
                                <span className="my-orders-unit-price">
                                  {' '}
                                  (단가 {formatPrice(unitPrice)})
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="my-orders-footer">
                    <p className="my-orders-summary">
                      {PAYMENT_LABELS[order.payment?.method] ||
                        order.payment?.method ||
                        '-'}
                      {' · '}
                      {STATUS_LABELS[normalizeStatus(order.status)] ||
                        order.status}
                    </p>
                    <p className="my-orders-total">
                      총 결제금액{' '}
                      <strong>{formatPrice(order.pricing?.total)}</strong>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error ? (
          <div className="order-success-actions my-orders-actions">
            <Link to="/" className="order-success-home-btn">
              쇼핑 계속하기
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default MyOrders;
