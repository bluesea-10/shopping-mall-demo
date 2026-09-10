import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { NAV_LINKS, PRODUCT_CATEGORIES } from '../data/homeContent';
import { useAuthUser } from '../hooks/useAuthUser';
import { useCartCount } from '../hooks/useCartCount';
import './Navbar.css';

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 8h12l-1 12H7L6 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V7a3 3 0 0 1 6 0v1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Navbar() {
  const { user, loading, isLoggedIn, isAdmin, logout } = useAuthUser();
  const cartCount = useCartCount(isLoggedIn);
  const badgeCount = cartCount > 99 ? '99+' : cartCount;
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const activeCategory =
    location.pathname === '/' ? searchParams.get('category') || '' : '';

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          POKETMON LAND
        </Link>

        <nav className="navbar-nav" aria-label="메인 메뉴">
          {NAV_LINKS.map((item) => {
            const isCategory = PRODUCT_CATEGORIES.includes(item);

            if (isCategory) {
              const isActive = activeCategory === item;
              return (
                <Link
                  key={item}
                  to={`/?category=${item}`}
                  className={`navbar-link ${isActive ? 'is-active' : ''}`}
                >
                  {item}
                </Link>
              );
            }

            return (
              <button key={item} type="button" className="navbar-link">
                {item}
              </button>
            );
          })}
        </nav>

        <div className="navbar-utils">
          {loading ? null : isLoggedIn ? (
            <div className="navbar-user">
              <p className="navbar-welcome">{user?.name}님 환영합니다</p>
              {isAdmin && (
                <Link to="/admin" className="navbar-admin-btn">
                  ADMIN
                </Link>
              )}
              {!isAdmin && (
                <Link to="/orders" className="navbar-orders-btn">
                  주문목록
                </Link>
              )}
              <button
                type="button"
                className="navbar-logout-btn"
                onClick={logout}
              >
                로그아웃
              </button>
              <Link
                to="/cart"
                className="navbar-cart-btn"
                aria-label={`장바구니 ${cartCount}개`}
              >
                <CartIcon />
                <span className="navbar-cart-badge">{badgeCount}</span>
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="navbar-util-link">
                LOGIN
              </Link>
              <Link to="/signup" className="navbar-util-link">
                JOIN
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
