const express = require('express');
const { login, getMe } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me - Authorization: Bearer <token>
router.get('/me', authMiddleware, getMe);

module.exports = router;
