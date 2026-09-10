import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllOrders, updateOrderStatus, deleteOrder } from '../api/client';
import { useAuthUser } from '../hooks/useAuthUser';
import './Admin.css';

/** Order.js 배송/주문 상태 */
const STATUS_OPTIONS = [
  { value: 'confirmed', label: '주문확인', tone: 'warning' },
  { value: 'preparing', label: '상품 준비중', tone: 'warning' },
  { value: 'ship_start', label: '배송시작', tone: 'info' },
  { value: 'shipping', label: '배송중', tone: 'info' },
  { value: 'delivered', label: '배송 완료', tone: 'success' },
  { value: 'cancelled', label: '주문 취소', tone: 'danger' },
];

const STATUS_META = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option])
);

const FILTER_TABS = [
  { value: 'all', label: '전체' },
  ...STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
];

function normalizeStatus(status) {
  if (status === 'paid' || status === 'pending') return 'confirmed';
  return status;
}

function formatPrice(price) {
  return `₩${Number(price || 0).toLocaleString('ko-KR')}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-order-eye">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function AdminOrders() {
  const navigate = useNavigate();
  const { loading, isLoggedIn, isAdmin } = useAuthUser();
  const [orders, setOrders] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [expandedId, setExpandedId] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!isLoggedIn) {
      navigate('/login', { replace: true });
      return;
    }

    if (!isAdmin) {
      navigate('/', { replace: true });
    }
  }, [loading, isLoggedIn, isAdmin, navigate]);

  useEffect(() => {
    if (loading || !isLoggedIn || !isAdmin) return undefined;

    let cancelled = false;

    const loadOrders = async () => {
      setListLoading(true);
      setError('');

      try {
        const data = await getAllOrders();
        if (!cancelled) {
          setOrders(data.orders || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || '주문 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [loading, isLoggedIn, isAdmin]);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((order) => {
      const status = normalizeStatus(order.status);

      if (filterTab !== 'all' && status !== filterTab) return false;

      if (!keyword) return true;

      const haystack = [
        order.orderNumber,
        order.user?.name,
        order.user?.email,
        order.shippingAddress?.recipient,
        order.shippingAddress?.phone,
        order.shippingAddress?.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [orders, search, filterTab]);

  const tabCounts = useMemo(() => {
    const counts = { all: orders.length };
    for (const option of STATUS_OPTIONS) {
      counts[option.value] = 0;
    }
    for (const order of orders) {
      const status = normalizeStatus(order.status);
      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
    }
    return counts;
  }, [orders]);

  const handleStatusChange = async (orderId, status) => {
    if (updatingId) return;

    setUpdatingId(orderId);
    try {
      const data = await updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? data.order : order))
      );
    } catch (err) {
      alert(err.message || '상태 변경에 실패했습니다.');
    } finally {
      setUpdatingId('');
    }
  };

  const handleDelete = async (orderId, orderNumber) => {
    if (updatingId) return;
    if (!window.confirm(`주문 ${orderNumber}을(를) 삭제할까요?`)) return;

    setUpdatingId(orderId);
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((order) => order._id !== orderId));
      if (expandedId === orderId) setExpandedId('');
    } catch (err) {
      alert(err.message || '주문 삭제에 실패했습니다.');
    } finally {
      setUpdatingId('');
    }
  };

  if (loading || !isLoggedIn || !isAdmin) {
    return <div className="admin-page admin-page--loading" />;
  }

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-logo">POKETMON LAND</span>
          <span className="admin-badge">ADMIN</span>
        </div>
        <Link to="/admin" className="admin-back-btn">
          대시보드로 돌아가기
        </Link>
      </header>

      <div className="admin-container">
        <section className="admin-intro">
          <h1>주문 관리</h1>
          <p>주문을 조회하고 배송 상태를 변경할 수 있습니다.</p>
        </section>

        <section className="admin-panel admin-panel--orders">
          <div className="admin-orders-toolbar">
            <label className="admin-orders-search">
              <span className="admin-orders-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="주문번호 또는 고객명으로 검색..."
              />
            </label>
          </div>

          <div className="admin-orders-tabs" role="tablist" aria-label="배송 상태 필터">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={filterTab === tab.value}
                className={`admin-orders-tab ${
                  filterTab === tab.value ? 'is-active' : ''
                }`}
                onClick={() => setFilterTab(tab.value)}
              >
                {tab.label} {tabCounts[tab.value] ?? 0}
              </button>
            ))}
          </div>

          {listLoading ? (
            <p className="admin-empty">주문 목록을 불러오는 중...</p>
          ) : error ? (
            <p className="admin-empty">{error}</p>
          ) : filteredOrders.length === 0 ? (
            <p className="admin-empty">
              {orders.length === 0
                ? '아직 주문이 없습니다.'
                : '검색/필터 조건에 맞는 주문이 없습니다.'}
            </p>
          ) : (
            <ul className="admin-order-list--full">
              {filteredOrders.map((order) => {
                const statusValue = normalizeStatus(order.status);
                const statusMeta =
                  STATUS_META[statusValue] || STATUS_META.confirmed;
                const busy = updatingId === order._id;
                const isExpanded = expandedId === order._id;
                const items = order.items || [];
                const addressLine = [
                  order.shippingAddress?.postalCode,
                  order.shippingAddress?.address,
                  order.shippingAddress?.detailAddress,
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <li key={order._id} className="admin-order-card">
                    <div className="admin-order-card-head">
                      <div className="admin-order-card-summary">
                        <p className="admin-order-id">{order.orderNumber}</p>
                        <p className="admin-order-date">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <label className="admin-order-status-label">
                        <span className="visually-hidden">배송상태</span>
                        <select
                          className={`admin-order-status-select admin-order-status-select--${statusMeta.tone}`}
                          value={
                            STATUS_META[statusValue]
                              ? statusValue
                              : 'confirmed'
                          }
                          disabled={busy}
                          onChange={(e) =>
                            handleStatusChange(order._id, e.target.value)
                          }
                          aria-label="배송상태 변경"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="admin-order-card-body">
                      <div className="admin-order-card-col">
                        <p className="admin-order-col-title">주문 상품</p>
                        <ul className="admin-order-products admin-order-products--summary">
                          {items.map((item) => {
                            const product = item.product || {};
                            const quantity = Number(item.quantity || 0);

                            return (
                              <li
                                key={item._id || `${product._id}-${item.size}`}
                                className="admin-order-product"
                              >
                                <div className="admin-order-product-thumb">
                                  {product.image ? (
                                    <img
                                      src={product.image}
                                      alt={product.name || '상품'}
                                    />
                                  ) : (
                                    <span />
                                  )}
                                </div>
                                <div className="admin-order-product-copy">
                                  <p className="admin-order-product-name">
                                    {product.name || '삭제된 상품'}
                                  </p>
                                  <p className="admin-order-product-meta">
                                    {[item.size, `수량 ${quantity}`]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="admin-order-customer">
                          주문자 {order.user?.name || '고객'}
                        </p>
                      </div>
                      <div className="admin-order-card-col">
                        <p className="admin-order-col-title">배송 주소</p>
                        <p className="admin-order-address-name">
                          {order.shippingAddress?.recipient || '-'}
                        </p>
                        <p className="admin-order-col-text">
                          {addressLine || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="admin-order-card-foot">
                      <span className="admin-order-amount admin-order-amount--accent">
                        {formatPrice(order.pricing?.total)}
                      </span>
                      <button
                        type="button"
                        className={`admin-order-detail-btn ${
                          isExpanded ? 'is-open' : ''
                        }`}
                        onClick={() =>
                          setExpandedId(isExpanded ? '' : order._id)
                        }
                      >
                        <EyeIcon />
                        {isExpanded ? '접기' : '상세보기'}
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="admin-order-card-detail">
                        <div className="admin-order-detail-grid">
                          <div>
                            <p className="admin-order-col-title">상품 상세</p>
                            <ul className="admin-order-products">
                              {items.map((item) => {
                                const product = item.product || {};
                                const quantity = Number(item.quantity || 0);
                                const unitPrice = Number(product.price || 0);

                                return (
                                  <li
                                    key={
                                      item._id || `${product._id}-${item.size}`
                                    }
                                    className="admin-order-product"
                                  >
                                    <div className="admin-order-product-thumb">
                                      {product.image ? (
                                        <img
                                          src={product.image}
                                          alt={product.name || '상품'}
                                        />
                                      ) : (
                                        <span />
                                      )}
                                    </div>
                                    <div className="admin-order-product-copy">
                                      <p className="admin-order-product-name">
                                        {product.name || '삭제된 상품'}
                                      </p>
                                      <p className="admin-order-product-meta">
                                        {[item.size, `×${quantity}`]
                                          .filter(Boolean)
                                          .join(' · ')}
                                        {' · '}
                                        {formatPrice(unitPrice * quantity)}
                                      </p>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                          <div>
                            <p className="admin-order-col-title">배송 / 연락처</p>
                            <p className="admin-order-col-text">
                              {order.shippingAddress?.phone || '-'}
                            </p>
                            <p className="admin-order-col-text">
                              {addressLine || '-'}
                            </p>
                            <button
                              type="button"
                              className="admin-order-delete-btn"
                              disabled={busy}
                              onClick={() =>
                                handleDelete(order._id, order.orderNumber)
                              }
                            >
                              주문 삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminOrders;
