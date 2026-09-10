const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        '올바른 이메일 형식이 아닙니다. (예: name@company.com)',
      ],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^[a-zA-Z가-힣]+(?:\s+[a-zA-Z가-힣]+)*$/,
        '이름에는 한글 또는 영문만 입력할 수 있습니다.',
      ],
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    user_type: {
      type: String,
      required: true,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
