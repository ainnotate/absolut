const express = require('express');
const { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  resetUserPassword, 
  getUserStats 
} = require('../controllers/userController');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All user management routes require admin authentication
router.use(authenticateToken, adminOnly);

// Get all users
router.get('/', getAllUsers);

// Get user statistics
router.get('/stats', getUserStats);

// Create new user
router.post('/', createUser);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

// Reset user password
router.put('/:id/reset-password', resetUserPassword);

module.exports = router;