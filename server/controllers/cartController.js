const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const SIZES = ['SMALL', 'BIG'];

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await Cart.findById(cart._id).populate('items.product');
  }

  return cart;
};

const isSameCartItem = (item, productId, size) => {
  const itemProductId = String(item.product?._id || item.product);
  const sameProduct = itemProductId === String(productId);
  const sameSize = (item.size || '') === (size || '');
  return sameProduct && sameSize;
};

/** GET /api/cart - 내 장바구니 조회 */
const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    return res.json({ cart });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/cart/items - 장바구니 상품 추가 */
const addCartItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1, size } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: '올바른 상품 ID가 필요합니다.' });
    }

    const numericQuantity = Number(quantity);
    if (!Number.isInteger(numericQuantity) || numericQuantity < 1) {
      return res.status(400).json({ message: '수량은 1 이상의 정수여야 합니다.' });
    }

    if (size !== undefined && size !== null && size !== '' && !SIZES.includes(size)) {
      return res.status(400).json({
        message: '사이즈는 SMALL, BIG 중 하나여야 합니다.',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    const cart = await getOrCreateCart(req.user.id);
    const normalizedSize = size || undefined;

    const existingItem = cart.items.find((item) =>
      isSameCartItem(item, productId, normalizedSize)
    );

    if (existingItem) {
      existingItem.quantity += numericQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity: numericQuantity,
        size: normalizedSize,
      });
    }

    await cart.save();
    await cart.populate('items.product');

    return res.status(201).json({
      message: '장바구니에 상품이 추가되었습니다.',
      cart,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        message: firstError?.message || error.message,
      });
    }

    return next(error);
  }
};

/** PUT /api/cart/items/:itemId - 장바구니 상품 수정 */
const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity, size } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: '올바른 장바구니 항목 ID가 필요합니다.' });
    }

    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
    }

    if (quantity !== undefined) {
      const numericQuantity = Number(quantity);
      if (!Number.isInteger(numericQuantity) || numericQuantity < 1) {
        return res.status(400).json({ message: '수량은 1 이상의 정수여야 합니다.' });
      }
      item.quantity = numericQuantity;
    }

    if (size !== undefined) {
      if (size === null || size === '') {
        item.size = undefined;
      } else if (!SIZES.includes(size)) {
        return res.status(400).json({
          message: '사이즈는 SMALL, BIG 중 하나여야 합니다.',
        });
      } else {
        item.size = size;
      }
    }

    await cart.save();
    await cart.populate('items.product');

    return res.json({
      message: '장바구니 항목이 수정되었습니다.',
      cart,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        message: firstError?.message || error.message,
      });
    }

    return next(error);
  }
};

/** DELETE /api/cart/items/:itemId - 장바구니 상품 삭제 */
const removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: '올바른 장바구니 항목 ID가 필요합니다.' });
    }

    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
    }

    item.deleteOne();
    await cart.save();
    await cart.populate('items.product');

    return res.json({
      message: '장바구니에서 상품이 삭제되었습니다.',
      cart,
    });
  } catch (error) {
    return next(error);
  }
};

/** DELETE /api/cart - 장바구니 비우기 */
const clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    return res.json({
      message: '장바구니를 비웠습니다.',
      cart,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
