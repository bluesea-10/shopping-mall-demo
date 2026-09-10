const express = require('express');
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getCheckoutDefaults,
} = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Read: 결제 시 배송지 기본값
router.get('/checkout-defaults', getCheckoutDefaults);

// Read: 내 주문 목록
router.get('/', getMyOrders);

// Read: 전체 주문 목록 (관리자) — AdminOrders.jsx
router.get('/admin', ...requireAdmin, getAllOrders);

// Create: 장바구니 → 주문 생성
router.post('/', createOrder);

// Read: 주문 상세
router.get('/:id', getOrderById);

// Update: 주문 상태 변경 (관리자) — AdminOrders.jsx select
router.patch('/:id/status', ...requireAdmin, updateOrderStatus);

// Update: 주문 정보 수정 (관리자)
router.put('/:id', ...requireAdmin, updateOrder);

// Delete: 주문 삭제 (관리자)
router.delete('/:id', ...requireAdmin, deleteOrder);

module.exports = router;
