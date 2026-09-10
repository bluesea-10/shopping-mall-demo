const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z가-힣]+(?:\s+[a-zA-Z가-힣]+)*$/;
const SALT_ROUNDS = 10;

const createToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      user_type: user.user_type,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

const checkEmail = async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.json({ exists: false });
    }

    const existingUser = await User.findOne({ email });
    return res.json({ exists: Boolean(existingUser) });
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { email, name, password, user_type, address } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: '이메일을 입력해 주세요.' });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: '이름을 입력해 주세요.' });
    }

    if (!password || !String(password).trim()) {
      return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        message: '올바른 이메일 형식이 아닙니다. (예: name@company.com)',
      });
    }

    if (!NAME_REGEX.test(normalizedName)) {
      return res.status(400).json({
        message: '이름에는 한글 또는 영문만 입력할 수 있습니다.',
      });
    }

    if (password.length < 8 || password.length > 16) {
      return res.status(400).json({
        message: '비밀번호는 8~16자를 입력해주세요',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: '이미 가입된 이메일입니다.',
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await User.create({
        email: normalizedEmail,
        name: normalizedName,
        password: hashedPassword,
        user_type: user_type || 'customer',
        address: address ? String(address).trim() : undefined,
      });

      const userData = user.toObject();
      delete userData.password;

      return res.status(201).json({
        message: '회원가입이 완료되었습니다.',
        user: userData,
      });
    } catch (createError) {
      if (createError.code === 11000) {
        return res.status(409).json({
          message: '이미 가입된 이메일입니다.',
        });
      }
      throw createError;
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
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

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { email, name, password, user_type, address } = req.body;
    const updateData = {};

    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (password !== undefined) {
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }
    if (user_type !== undefined) updateData.user_type = user_type;
    if (address !== undefined) updateData.address = address;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: '이메일을 입력해 주세요.' });
    }

    if (!password || !String(password).trim()) {
      return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        message: '올바른 이메일 형식이 아닙니다. (예: name@company.com)',
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const userData = user.toObject();
    delete userData.password;

    const token = createToken(user);

    return res.status(200).json({
      message: '로그인에 성공했습니다.',
      token,
      user: userData,
    });
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
    }

    return res.status(200).json({
      message: '유저 정보를 조회했습니다.',
      user,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  checkEmail,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  login,
  getMe,
};
