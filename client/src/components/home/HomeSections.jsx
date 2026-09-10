import { memo, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAllProducts } from '../../api/client';
import {
  FAMILY_BRANDS,
  FOCUS_ITEMS,
  HERO_IMAGE,
  NOTICE_ITEMS,
  PRODUCT_CATEGORIES,
} from '../../data/homeContent';
import { CATEGORY_LABELS } from '../../data/productCategories';

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`;
}

function HomeContent() {
  const [searchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || '';
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError('');

      try {
        const data = await getAllProducts();
        if (!cancelled) {
          setProducts(Array.isArray(data.products) ? data.products : []);
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          setProductsError(
            error.message || '상품 목록을 불러오지 못했습니다.'
          );
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    const section = document.getElementById('products');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCategory]);

  const visibleProducts = useMemo(() => {
    if (
      !selectedCategory ||
      !PRODUCT_CATEGORIES.includes(selectedCategory)
    ) {
      return products;
    }

    return products.filter(
      (product) => String(product.category).toUpperCase() === selectedCategory
    );
  }, [products, selectedCategory]);

  const productsTitle = selectedCategory
    ? `${CATEGORY_LABELS[selectedCategory] || selectedCategory} PRODUCTS`
    : 'PRODUCTS';

  return (
    <>
      <section className="home-hero">
        <div
          className="home-hero-media"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="home-hero-copy">
          <p className="home-hero-kicker">PREMIUM POKET SHOP</p>
          <h1>POKETMON LAND</h1>
          <p className="home-hero-desc">
            하나씩 가지고싶은 포켓몬들만의 SEASON 컬렉션
          </p>
        </div>
      </section>

      <section className="home-section" id="products">
        <div className="home-products-head">
          <h2 className="home-section-title">{productsTitle}</h2>
          {selectedCategory ? (
            <Link to="/" className="home-products-clear">
              전체 보기
            </Link>
          ) : null}
        </div>

        {productsLoading ? (
          <p className="home-products-status">상품을 불러오는 중...</p>
        ) : productsError ? (
          <p className="home-products-status home-products-status--error">
            {productsError}
          </p>
        ) : visibleProducts.length === 0 ? (
          <p className="home-products-status">
            {selectedCategory
              ? `${selectedCategory} 카테고리 상품이 없습니다.`
              : '등록된 상품이 없습니다.'}
          </p>
        ) : (
          <ul className="home-products-grid">
            {visibleProducts.map((product) => (
              <li key={product._id}>
                <Link
                  to={`/products/${product._id}`}
                  className="home-product-card"
                >
                  <div
                    className="home-product-image"
                    style={
                      product.image
                        ? { backgroundImage: `url(${product.image})` }
                        : undefined
                    }
                  />
                  <div className="home-product-body">
                    <p className="home-product-category">
                      {CATEGORY_LABELS[product.category] || product.category}
                    </p>
                    <h3>{product.name}</h3>
                    <p className="home-product-price">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home-section">
        <h2 className="home-section-title">NOTICE</h2>
        <div className="home-notice-grid">
          {NOTICE_ITEMS.map((item) => (
            <article key={item.id} className="home-notice-item">
              <div
                className="home-notice-image"
                style={{ backgroundImage: `url(${item.image})` }}
              />
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
        <div className="home-instagram">
          <p>FOLLOW US ON INSTAGRAM</p>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            @poketmonland_official
          </a>
        </div>
      </section>

      <section className="home-section home-section--focus">
        <h2 className="home-section-title">FOCUS ON</h2>
        <ul className="home-focus-grid">
          {FOCUS_ITEMS.map((item) => (
            <li key={item.id}>
              <article
                className="home-focus-card"
                style={{ backgroundImage: `url(${item.image})` }}
              >
                <div className="home-focus-overlay">
                  <h3>{item.title}</h3>
                  <span>VIEW +</span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section">
        <h2 className="home-section-title">FAMILY BRAND</h2>
        <ul className="home-brand-grid">
          {FAMILY_BRANDS.map((brand) => (
            <li key={brand.id}>
              <article className="home-brand-card">
                <div
                  className="home-brand-image"
                  style={{ backgroundImage: `url(${brand.image})` }}
                />
                <h3>{brand.name}</h3>
                <p>{brand.desc}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="home-footer-inner">
        <p className="home-footer-logo">POKETMON LAND</p>
        <div className="home-footer-info">
          <p>서울특별시 강남구 테헤란로 000</p>
          <p>고객센터 1588-0000 · help@poketmonland.demo</p>
          <p>© POKETMON LAND. ALL RIGHTS RESERVED.</p>
        </div>
        <div className="home-footer-social">
          <span>Facebook</span>
          <span>Instagram</span>
          <span>YouTube</span>
        </div>
      </div>
    </footer>
  );
}

export const HomeMain = memo(HomeContent);
export const HomePageFooter = memo(HomeFooter);
