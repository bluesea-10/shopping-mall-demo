import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  getCart,
  getStoredToken,
  removeCartItem,
  updateCartItem,
} from '../api/client';
import { notifyCartUpdated } from '../hooks/useCartCount';
import './Cart.css';

function formatPrice(price) {
  return `₩${Number(price).toLocaleString('ko-KR')}`;
}

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login', { replace: true });
      return undefined;
    }

    let cancelled = false;

    const loadCart = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getCart();
        if (!cancelled) {
          setCart(data.cart);
          notifyCartUpdated(data.cart);
        }
      } catch (err) {
        if (!cancelled) {
          if (err.status === 401) {
            navigate('/login', { replace: true });
            return;
          }
          setError(err.message || '장바구니를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCart();

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

  const applyCartUpdate = (nextCart) => {
    setCart(nextCart);
    notifyCartUpdated(nextCart);
  };

  const handleQuantityChange = async (itemId, nextQuantity) => {
    if (nextQuantity < 1 || updatingId) return;

    setUpdatingId(itemId);
    try {
      const data = await updateCartItem(itemId, { quantity: nextQuantity });
      applyCartUpdate(data.cart);
    } catch (err) {
      alert(err.message || '수량 변경에 실패했습니다.');
    } finally {
      setUpdatingId('');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('이 상품을 장바구니에서 삭제할까요?')) return;
    if (updatingId) return;

    setUpdatingId(itemId);
    try {
      const data = await removeCartItem(itemId);
      applyCartUpdate(data.cart);
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다.');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="cart-page">
      <Navbar />

      <main className="cart-main">
        {loading ? (
          <p className="cart-status">장바구니를 불러오는 중...</p>
        ) : error ? (
          <p className="cart-status cart-status--error">{error}</p>
        ) : items.length === 0 ? (
          <div className="cart-empty">
            <p>장바구니가 비어 있습니다.</p>
            <Link to="/" className="cart-continue-btn">
              쇼핑 계속하기
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-items" aria-label="장바구니 상품">
              {items.map((item) => {
                const product = item.product || {};
                const unitPrice = Number(product.price || 0);
                const lineTotal = unitPrice * Number(item.quantity || 0);
                const busy = updatingId === item._id;

                return (
                  <article key={item._id} className="cart-item-card">
                    <Link
                      to={`/products/${product._id}`}
                      className="cart-item-thumb"
                    >
                      {product.image ? (
                        <img src={product.image} alt={product.name || ''} />
                      ) : (
                        <span className="cart-item-thumb-placeholder" />
                      )}
                    </Link>

                    <div className="cart-item-body">
                      <div className="cart-item-top">
                        <div>
                          <Link
                            to={`/products/${product._id}`}
                            className="cart-item-name"
                          >
                            {product.name || '삭제된 상품'}
                          </Link>
                          <p className="cart-item-sku">
                            SKU: {product.sku || '-'}
                            {item.size ? ` · ${item.size}` : ''}
                          </p>
                          <p className="cart-item-unit">
                            {formatPrice(unitPrice)}
                          </p>
                        </div>
                        <p className="cart-item-line-total">
                          {formatPrice(lineTotal)}
                        </p>
                      </div>

                      <div className="cart-item-bottom">
                        <div className="cart-qty">
                          <button
                            type="button"
                            disabled={busy || item.quantity <= 1}
                            onClick={() =>
                              handleQuantityChange(item._id, item.quantity - 1)
                            }
                            aria-label="수량 감소"
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              handleQuantityChange(item._id, item.quantity + 1)
                            }
                            aria-label="수량 증가"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="cart-delete-btn"
                          disabled={busy}
                          onClick={() => handleDelete(item._id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="cart-summary">
              <h2>주문 요약</h2>
              <div className="cart-summary-row">
                <span>상품 수량 ({totalQuantity}개)</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="cart-summary-row">
                <span>배송비</span>
                <span className="cart-shipping-free">무료</span>
              </div>
              <div className="cart-summary-row cart-summary-row--total">
                <span>총 결제금액</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <button
                type="button"
                className="cart-checkout-btn"
                onClick={() => navigate('/checkout')}
              >
                결제하기
              </button>
              <Link to="/" className="cart-continue-btn">
                쇼핑 계속하기
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default Cart;
