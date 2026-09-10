const express = require('express');
const {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Read: 내 장바구니 조회
router.get('/', getCart);

// Create: 장바구니 상품 추가
router.post('/items', addCartItem);

// Update: 장바구니 상품 수정
router.put('/items/:itemId', updateCartItem);

// Delete: 장바구니 상품 삭제
router.delete('/items/:itemId', removeCartItem);

// Delete: 장바구니 전체 비우기
router.delete('/', clearCart);

module.exports = router;
