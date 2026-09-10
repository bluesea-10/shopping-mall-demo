import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  createProduct,
  getProductById,
  updateProduct,
} from '../api/client';
import { CATEGORY_OPTIONS } from '../data/productCategories';
import { useAuthUser } from '../hooks/useAuthUser';
import { openCloudinaryUploadWidget } from '../utils/cloudinaryUpload';
import './AdminProducts.css';

const EMPTY_FORM = {
  sku: '',
  name: '',
  price: '',
  category: 'FIRE',
  image: '',
  description: '',
};

function AdminProductRegister() {
  const navigate = useNavigate();
  const { id: productId } = useParams();
  const isEditMode = Boolean(productId);
  const { loading, isLoggedIn, isAdmin } = useAuthUser();

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);

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
    if (!isEditMode || loading || !isLoggedIn || !isAdmin) {
      if (!isEditMode) {
        setForm(EMPTY_FORM);
        setLoadingProduct(false);
      }
      return undefined;
    }

    let cancelled = false;

    const loadProduct = async () => {
      setLoadingProduct(true);
      setFormError('');

      try {
        const product = await getProductById(productId);
        if (cancelled) return;

        setForm({
          sku: product.sku || '',
          name: product.name || '',
          price: product.price ?? '',
          category: product.category || 'FIRE',
          image: product.image || '',
          description: product.description || '',
        });
      } catch (error) {
        if (!cancelled) {
          setFormError(error.message || '상품 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    };

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, productId, loading, isLoggedIn, isAdmin]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError('');
    setFormSuccess('');
  };

  const handleOpenUploadWidget = async () => {
    setFormError('');
    setFormSuccess('');
    setUploadingImage(true);

    try {
      await openCloudinaryUploadWidget({
        onSuccess: (imageUrl) => {
          setForm((prev) => ({ ...prev, image: imageUrl }));
          setFormError('');
        },
        onError: (error) => {
          setFormError(error.message || '이미지 업로드에 실패했습니다.');
        },
      });
    } catch (error) {
      setFormError(error.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleClearImage = () => {
    setForm((prev) => ({ ...prev, image: '' }));
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.sku.trim() || !form.name.trim() || !form.price || !form.image.trim()) {
      setFormError('SKU, 상품 이름, 가격, 이미지는 필수입니다.');
      return;
    }

    setSubmitting(true);

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      image: form.image.trim(),
      description: form.description.trim(),
    };

    try {
      if (isEditMode) {
        await updateProduct(productId, payload);
        setFormSuccess('상품이 수정되었습니다.');
      } else {
        await createProduct(payload);
        setForm(EMPTY_FORM);
        setFormSuccess('상품이 등록되었습니다.');
      }

      navigate('/admin/products');
    } catch (error) {
      setFormError(
        error.message ||
          (isEditMode ? '상품 수정에 실패했습니다.' : '상품 등록에 실패했습니다.')
      );
    } finally {
      setSubmitting(false);
    }
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
            `products-tab ${isActive || isEditMode ? 'is-active' : ''}`
          }
        >
          {isEditMode ? '상품 수정' : '상품 등록'}
        </NavLink>
      </nav>

      <section className="products-panel">
        {loadingProduct ? (
          <p className="products-empty">상품 정보를 불러오는 중...</p>
        ) : (
          <form className="products-form" onSubmit={handleSubmit} noValidate>
            <div className="products-form-grid">
              <label className="products-field">
                <span>SKU</span>
                <input
                  type="text"
                  name="sku"
                  value={form.sku}
                  onChange={handleFormChange}
                  placeholder="예: PK-001"
                />
              </label>

              <label className="products-field">
                <span>상품 이름</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="상품명을 입력하세요"
                />
              </label>

              <label className="products-field">
                <span>상품 가격</span>
                <input
                  type="number"
                  name="price"
                  min="0"
                  value={form.price}
                  onChange={handleFormChange}
                  placeholder="0"
                />
              </label>

              <label className="products-field">
                <span>카테고리</span>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="products-field">
              <span>상품 이미지</span>
              <div className="products-image-actions">
                <button
                  type="button"
                  className="products-upload-btn"
                  onClick={handleOpenUploadWidget}
                  disabled={uploadingImage}
                >
                  {uploadingImage
                    ? '업로드 창 여는 중...'
                    : form.image
                      ? '이미지 변경'
                      : 'Cloudinary로 이미지 업로드'}
                </button>
                {form.image && (
                  <button
                    type="button"
                    className="products-clear-image-btn"
                    onClick={handleClearImage}
                  >
                    이미지 제거
                  </button>
                )}
              </div>
            </div>

            <div className="products-image-preview">
              {form.image ? (
                <img
                  src={form.image}
                  alt="상품 미리보기"
                  className="products-image-preview-img"
                />
              ) : (
                <div className="products-image-placeholder">
                  <span aria-hidden="true" />
                  <p>업로드하면 미리보기가 표시됩니다</p>
                </div>
              )}
            </div>

            <label className="products-field">
              <span>설명 (선택)</span>
              <textarea
                name="description"
                rows="4"
                value={form.description}
                onChange={handleFormChange}
                placeholder="상품 설명을 입력하세요"
              />
            </label>

            {formError && <p className="products-form-error">{formError}</p>}
            {formSuccess && (
              <p className="products-form-success">{formSuccess}</p>
            )}

            <button
              type="submit"
              className="products-submit-btn"
              disabled={submitting}
            >
              {submitting
                ? isEditMode
                  ? '수정 중...'
                  : '등록 중...'
                : isEditMode
                  ? '상품 수정'
                  : '상품 등록'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export default AdminProductRegister;
