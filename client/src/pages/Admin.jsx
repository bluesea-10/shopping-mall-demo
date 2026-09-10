import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminIcon from '../components/admin/AdminIcon';
import {
  ADMIN_MENUS,
  ADMIN_STATS,
  RECENT_ORDERS,
} from '../data/adminContent';
import { useAuthUser } from '../hooks/useAuthUser';
import './Admin.css';

function Admin() {
  const navigate = useNavigate();
  const { loading, isLoggedIn, isAdmin, user } = useAuthUser();

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
        <div className="admin-topbar-right">
          <span className="admin-welcome">
            {user?.name ? `${user.name}님 환영합니다` : '관리자님 환영합니다'}
          </span>
          <Link to="/" className="admin-back-btn">
            쇼핑몰로 돌아가기
          </Link>
        </div>
      </header>

      <div className="admin-container">
        <section className="admin-intro">
          <h1>관리자 대시보드</h1>
          <p>POKETMON LAND 쇼핑몰 관리 시스템에 오신 것을 환영합니다.</p>
        </section>

        <section className="admin-stats" aria-label="요약 지표">
          {ADMIN_STATS.map((stat) => (
            <article key={stat.id} className="admin-stat-card">
              <div className="admin-stat-copy">
                <p className="admin-stat-label">{stat.label}</p>
                <p className="admin-stat-value">{stat.value}</p>
                <p className={`admin-stat-change admin-stat-change--${stat.tone}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`admin-stat-icon admin-stat-icon--${stat.tone}`}>
                <AdminIcon name={stat.icon} />
              </div>
            </article>
          ))}
        </section>

        <section className="admin-panel admin-panel--orders">
          <div className="admin-panel-head">
            <h2>최근 주문</h2>
            <button
              type="button"
              className="admin-view-all"
              onClick={() => navigate('/admin/orders')}
            >
              전체보기
            </button>
          </div>
          <ul className="admin-order-list">
            {RECENT_ORDERS.map((order) => (
              <li key={order.id} className="admin-order-item">
                <div className="admin-order-info">
                  <p className="admin-order-id">{order.id}</p>
                  <p className="admin-order-customer">{order.customer}</p>
                  <p className="admin-order-date">{order.date}</p>
                </div>
                <div className="admin-order-meta">
                  <span
                    className={`admin-status admin-status--${order.statusTone}`}
                  >
                    {order.status}
                  </span>
                  <span className="admin-order-amount">{order.amount}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-menus" aria-label="관리 메뉴">
          {ADMIN_MENUS.map((menu) => (
            <button
              key={menu.id}
              type="button"
              className="admin-menu-card"
              onClick={() => navigate(menu.to)}
            >
              <span
                className={`admin-menu-icon admin-menu-icon--${menu.tone}`}
                aria-hidden="true"
              >
                <AdminIcon name={menu.icon} />
              </span>
              <span className="admin-menu-title">{menu.title}</span>
              <span className="admin-menu-desc">{menu.description}</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Admin;
