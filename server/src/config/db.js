const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_ATLAS_URL || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_ATLAS_URL 또는 MONGODB_URI가 환경 변수에 필요합니다.'
    );
  }

  await mongoose.connect(uri);
  console.log(
    `MongoDB connected (${process.env.MONGODB_ATLAS_URL ? 'Atlas' : 'URI'})`
  );
};

module.exports = connectDB;
