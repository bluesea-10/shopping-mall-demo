import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { deleteProduct, getProducts } from '../api/client';
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from '../data/productCategories';
import { useAuthUser } from '../hooks/useAuthUser';
import './AdminProducts.css';

const PAGE_SIZE = 2;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m20 20-3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 11v6M14 11v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPrice(price) {
  return `${Number(price).toLocaleString('ko-KR')}원`;
}

function getPageNumbers(currentPage, totalPages) {
  const pages = [];
  const maxButtons = 7;

  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    return pages;
  }

  pages.push(1);

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    start = 2;
    end = 4;
  } else if (currentPage >= totalPages - 2) {
    start = totalPages - 3;
    end = totalPages - 1;
  }

  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push('...');

  pages.push(totalPages);
  return pages;
}

function AdminProductList() {
  const navigate = useNavigate();
  const { loading, isLoggedIn, isAdmin } = useAuthUser();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

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
    if (loading || !isLoggedIn || !isAdmin) return;

    let cancelled = false;

    const loadProducts = async () => {
      setListLoading(true);
      setListError('');

      try {
        const data = await getProducts({
          page,
          limit: PAGE_SIZE,
          ...(categoryFilter ? { category: categoryFilter } : {}),
          ...(search.trim() ? { name: search.trim() } : {}),
        });

        if (cancelled) return;

        setProducts(Array.isArray(data.products) ? data.products : []);
        setPagination(
          data.pagination || {
            page,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          }
        );
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          setListError(error.message || '상품 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [loading, isLoggedIn, isAdmin, categoryFilter, page, search, reloadToken]);

  const handleDelete = async (id) => {
    if (!window.confirm('이 상품을 삭제할까요?')) return;

    try {
      await deleteProduct(id);

      if (products.length <= 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        setReloadToken((prev) => prev + 1);
      }
    } catch (error) {
      alert(error.message || '상품 삭제에 실패했습니다.');
    }
  };

  const handleSelectCategory = (value) => {
    setCategoryFilter(value);
    setPage(1);
    setFilterOpen(false);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  if (loading || !isLoggedIn || !isAdmin) {
    return <div className="products-page products-page--loading" />;
  }

  return (
    <div className="products-page">
      <header className="products-header">
        <div className="products-header-left">
          <button
            type="button"
            className="products-back"
            onClick={() => navigate('/admin')}
            aria-label="대시보드로 돌아가기"
          >
            ←
          </button>
          <h1>상품 관리</h1>
        </div>
        <Link to="/admin/products/register" className="products-create-btn">
          + 새 상품 등록
        </Link>
      </header>

      <nav className="products-tabs" aria-label="상품 관리 탭">
        <NavLink
          to="/admin/products"
          end
          className={({ isActive }) =>
            `products-tab ${isActive ? 'is-active' : ''}`
          }
        >
          상품 목록
        </NavLink>
        <NavLink
          to="/admin/products/register"
          className={({ isActive }) =>
            `products-tab ${isActive ? 'is-active' : ''}`
          }
        >
          상품 등록
        </NavLink>
      </nav>

      <section className="products-panel">
        <div className="products-toolbar">
          <label className="products-search">
            <span className="products-search-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="상품명으로 검색..."
            />
          </label>

          <div className="products-filter-wrap">
            <button
              type="button"
              className="products-filter-btn"
              onClick={() => setFilterOpen((open) => !open)}
              aria-expanded={filterOpen}
            >
              필터
              {categoryFilter ? ` · ${categoryFilter}` : ''}
            </button>
            {filterOpen && (
              <div className="products-filter-menu" role="listbox">
                <button
                  type="button"
                  className={!categoryFilter ? 'is-selected' : ''}
                  onClick={() => handleSelectCategory('')}
                >
                  전체
                </button>
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      categoryFilter === option.value ? 'is-selected' : ''
                    }
                    onClick={() => handleSelectCategory(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {listLoading ? (
          <p className="products-empty">상품을 불러오는 중...</p>
        ) : listError ? (
          <p className="products-empty products-empty--error">{listError}</p>
        ) : products.length === 0 ? (
          <p className="products-empty">등록된 상품이 없습니다.</p>
        ) : (
          <>
            <div className="products-table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>이미지</th>
                    <th>상품명</th>
                    <th>카테고리</th>
                    <th>가격</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="products-thumb">
                          {product.image ? (
                            <img src={product.image} alt="" />
                          ) : (
                            <span className="products-thumb-placeholder" />
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="products-table-name">{product.name}</span>
                      </td>
                      <td>
                        <span className="products-table-category">
                          {CATEGORY_LABELS[product.category] || product.category}
                        </span>
                      </td>
                      <td>
                        <span className="products-table-price">
                          {formatPrice(product.price)}
                        </span>
                      </td>
                      <td>
                        <div className="products-table-actions">
                          <button
                            type="button"
                            className="products-icon-btn"
                            aria-label={`${product.name} 수정`}
                            onClick={() =>
                              navigate(`/admin/products/${product._id}/edit`)
                            }
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            className="products-icon-btn products-icon-btn--danger"
                            aria-label={`${product.name} 삭제`}
                            onClick={() => handleDelete(product._id)}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="products-pagination">
              <button
                type="button"
                className="products-page-btn"
                disabled={!pagination.hasPrev || listLoading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                이전
              </button>

              <div className="products-page-numbers" aria-label="페이지 번호">
                {getPageNumbers(pagination.page, pagination.totalPages).map(
                  (item, index) =>
                    item === '...' ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="products-page-ellipsis"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`products-page-number ${
                          item === pagination.page ? 'is-active' : ''
                        }`}
                        disabled={listLoading || item === pagination.page}
                        onClick={() => setPage(item)}
                        aria-current={
                          item === pagination.page ? 'page' : undefined
                        }
                      >
                        {item}
                      </button>
                    )
                )}
              </div>

              <button
                type="button"
                className="products-page-btn"
                disabled={!pagination.hasNext || listLoading}
                onClick={() => setPage((prev) => prev + 1)}
              >
                다음
              </button>
            </div>
            <p className="products-page-total">총 {pagination.total}개</p>
          </>
        )}
      </section>
    </div>
  );
}

export default AdminProductList;
