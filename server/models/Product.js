const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, '상품 가격은 0 이상이어야 합니다.'],
    },
    category: {
      type: String,
      required: true,
      enum: {
        values: ['FIRE', 'WATER', 'GRASS', 'FLY', 'ELEC', 'LEGEND'],
        message: '카테고리는 FIRE, WATER, GRASS, FLY, ELEC, LEGEND 중 하나여야 합니다.',
      },
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
