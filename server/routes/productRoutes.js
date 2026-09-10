const express = require('express');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

// 공개: 상품 조회
// - 페이지네이션: ?page=1&limit=2
// - 전체 조회: ?all=true
router.get('/', getProducts);
router.get('/:id', getProductById);

// 관리자: 상품 등록/수정/삭제
router.post('/', ...requireAdmin, createProduct);
router.put('/:id', ...requireAdmin, updateProduct);
router.delete('/:id', ...requireAdmin, deleteProduct);

module.exports = router;
