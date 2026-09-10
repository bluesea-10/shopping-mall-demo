import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { addCartItem, getProductById, getStoredToken } from '../api/client';
import { CATEGORY_LABELS } from '../data/productCategories';
import { notifyCartUpdated } from '../hooks/useCartCount';
import './ProductDetail.css';

const SIZES = ['SMALL', 'BIG'];

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`;
}

function formatPricePlain(price) {
  return Number(price).toLocaleString('ko-KR');
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState('SMALL');
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getProductById(id);
        if (!cancelled) {
          setProduct(data);
          setQuantity(1);
        }
      } catch (err) {
        if (!cancelled) {
          setProduct(null);
          setError(err.message || '상품 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const originalPrice = useMemo(() => {
    if (!product) return 0;
    return Math.round(Number(product.price) * 1.35);
  }, [product]);

  const discountRate = useMemo(() => {
    if (!product || !originalPrice) return 0;
    return Math.round(
      ((originalPrice - Number(product.price)) / originalPrice) * 100
    );
  }, [product, originalPrice]);

  const totalPrice = product ? Number(product.price) * quantity : 0;
  const stockLeft = 5;
  const images = product?.image ? [product.image, product.image, product.image] : [];

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name,
          url: window.location.href,
        });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다.');
    } catch {
      // user cancelled share
    }
  };

  const handleAddToBag = async () => {
    if (!product) return;

    if (!getStoredToken()) {
      navigate('/login', { replace: true });
      return;
    }

    setAddingToCart(true);

    try {
      const data = await addCartItem({
        productId: product._id,
        quantity,
        size: selectedSize,
      });

      notifyCartUpdated(data.cart);
      alert(
        data.message ||
          `${product.name} (${selectedSize}) ${quantity}개가 장바구니에 담겼습니다.`
      );
    } catch (err) {
      if (err.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      alert(err.message || '장바구니 추가에 실패했습니다.');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-page detail-page--loading">
        <Navbar />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="detail-page">
        <Navbar />
        <p className="detail-status detail-status--error">
          {error || '상품을 찾을 수 없습니다.'}
        </p>
        <p className="detail-back-home">
          <Link to="/">홈으로 돌아가기</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <Navbar />

      <div className="detail-subbar">
        <button
          type="button"
          className="detail-icon-btn"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
        >
          ←
        </button>
        <p className="detail-topbar-title">{product.name}</p>
        <div className="detail-topbar-actions">
          <button
            type="button"
            className="detail-icon-btn"
            onClick={handleShare}
            aria-label="공유"
          >
            <ShareIcon />
          </button>
          <button
            type="button"
            className={`detail-icon-btn ${liked ? 'is-liked' : ''}`}
            onClick={() => setLiked((prev) => !prev)}
            aria-label="위시리스트"
          >
            <HeartIcon filled={liked} />
          </button>
        </div>
      </div>

      <div className="detail-layout">
        <section className="detail-gallery">
          <div className="detail-main-image">
            {product.image ? (
              <img src={product.image} alt={product.name} />
            ) : (
              <span className="detail-image-placeholder" aria-hidden="true" />
            )}
          </div>
          <div className="detail-thumbs">
            {images.map((src, index) => (
              <button
                key={`${product._id}-thumb-${index}`}
                type="button"
                className={`detail-thumb ${index === 0 ? 'is-active' : ''}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </section>

        <section className="detail-info">
          <div className="detail-badges">
            <span className="detail-badge detail-badge--new">NEW</span>
            <span className="detail-badge detail-badge--sale">SALE</span>
          </div>

          <h1>{product.name}</h1>
          <p className="detail-category">
            {CATEGORY_LABELS[product.category] || product.category} · SKU{' '}
            {product.sku}
          </p>

          <p className="detail-rating">
            <span className="detail-star" aria-hidden="true">
              ★
            </span>
            4.8 <span>(124 reviews)</span>
          </p>

          <div className="detail-price-row">
            <strong>{formatPrice(product.price)}</strong>
            <span className="detail-price-original">
              {formatPrice(originalPrice)}
            </span>
            <span className="detail-discount">{discountRate}% OFF</span>
          </div>

          {product.description && (
            <p className="detail-description">{product.description}</p>
          )}

          <div className="detail-field">
            <p className="detail-label">Size</p>
            <div className="detail-size-list">
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`detail-size-btn ${
                    selectedSize === size ? 'is-active' : ''
                  }`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="detail-field detail-qty-row">
            <div>
              <p className="detail-label">Quantity</p>
              <div className="detail-qty">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="수량 감소"
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(stockLeft, q + 1))
                  }
                  aria-label="수량 증가"
                >
                  +
                </button>
              </div>
            </div>
            <p className="detail-stock">Only {stockLeft} left in stock</p>
          </div>

          <button
            type="button"
            className="detail-cart-btn"
            onClick={handleAddToBag}
            disabled={addingToCart}
          >
            <BagIcon />
            {addingToCart
              ? '담는 중...'
              : `ADD TO BAG - ${formatPricePlain(totalPrice)}원`}
          </button>

          <button
            type="button"
            className={`detail-wishlist-btn ${liked ? 'is-active' : ''}`}
            onClick={() => setLiked((prev) => !prev)}
          >
            <HeartIcon filled={liked} />
            ADD TO WISHLIST
          </button>
        </section>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8.2 10.8 7.5-4.2M8.2 13.2l7.5 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-9.5-8.3C.4 8.6 2.1 5 5.6 5c2 0 3.3 1.2 4 2.2.7-1 2-2.2 4-2.2 3.5 0 5.2 3.6 3.1 6.7C19 15.6 12 20 12 20Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BagIcon() {
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

export default ProductDetail;
