const Product = require('../models/Product');

const CATEGORIES = ['FIRE', 'WATER', 'GRASS', 'FLY', 'ELEC', 'LEGEND'];

const createProduct = async (req, res, next) => {
  try {
    const { sku, name, price, category, image, description } = req.body;

    if (!sku || !String(sku).trim()) {
      return res.status(400).json({ message: 'SKU를 입력해 주세요.' });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: '상품 이름을 입력해 주세요.' });
    }

    if (price === undefined || price === null || price === '') {
      return res.status(400).json({ message: '상품 가격을 입력해 주세요.' });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: '상품 가격은 0 이상이어야 합니다.' });
    }

    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: '카테고리는 FIRE, WATER, GRASS, FLY, ELEC, LEGEND 중 하나여야 합니다.',
      });
    }

    if (!image || !String(image).trim()) {
      return res.status(400).json({ message: '상품 이미지를 입력해 주세요.' });
    }

    const normalizedSku = String(sku).trim().toUpperCase();

    const existing = await Product.findOne({ sku: normalizedSku });
    if (existing) {
      return res.status(409).json({ message: '이미 사용 중인 SKU입니다.' });
    }

    const product = await Product.create({
      sku: normalizedSku,
      name: String(name).trim(),
      price: numericPrice,
      category,
      image: String(image).trim(),
      description: description ? String(description).trim() : undefined,
    });

    return res.status(201).json({
      message: '상품이 등록되었습니다.',
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: '이미 사용 중인 SKU입니다.' });
    }

    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        message: firstError?.message || error.message,
      });
    }

    return next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    if (req.query.name && String(req.query.name).trim()) {
      filter.name = {
        $regex: String(req.query.name).trim(),
        $options: 'i',
      };
    }

    const fetchAll =
      String(req.query.all || '').toLowerCase() === 'true' ||
      String(req.query.limit || '').toLowerCase() === 'all';

    if (fetchAll) {
      const products = await Product.find(filter).sort({ createdAt: -1 });
      const total = products.length;

      return res.json({
        products,
        pagination: {
          page: 1,
          limit: total,
          total,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 2);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    return res.json(product);
  } catch (error) {
    return next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { sku, name, price, category, image, description } = req.body;
    const updateData = {};

    if (sku !== undefined) {
      if (!String(sku).trim()) {
        return res.status(400).json({ message: 'SKU를 입력해 주세요.' });
      }
      updateData.sku = String(sku).trim().toUpperCase();
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: '상품 이름을 입력해 주세요.' });
      }
      updateData.name = String(name).trim();
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ message: '상품 가격은 0 이상이어야 합니다.' });
      }
      updateData.price = numericPrice;
    }

    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({
          message: '카테고리는 FIRE, WATER, GRASS, FLY, ELEC, LEGEND 중 하나여야 합니다.',
        });
      }
      updateData.category = category;
    }

    if (image !== undefined) {
      if (!String(image).trim()) {
        return res.status(400).json({ message: '상품 이미지를 입력해 주세요.' });
      }
      updateData.image = String(image).trim();
    }

    if (description !== undefined) {
      updateData.description = description
        ? String(description).trim()
        : undefined;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    return res.json({
      message: '상품이 수정되었습니다.',
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: '이미 사용 중인 SKU입니다.' });
    }

    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        message: firstError?.message || error.message,
      });
    }

    return next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    return res.json({ message: '상품이 삭제되었습니다.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
