const express = require('express');
const { login, googleLogin, register, changeRole } = require('../controllers/authController');
const { authenticateToken, adminOnly, supervisorOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/register', register);
router.put('/change-role', authenticateToken, supervisorOrAdmin, changeRole);

module.exports = router;