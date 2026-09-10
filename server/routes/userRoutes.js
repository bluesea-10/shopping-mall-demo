const express = require('express');
const {
  checkEmail,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  login,
  getMe,
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', createUser);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.get('/check-email', checkEmail);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
