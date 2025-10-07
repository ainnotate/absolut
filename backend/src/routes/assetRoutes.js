const express = require('express');
const router = express.Router();
const { getAssets } = require('../controllers/assetController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all assets (admin only)
router.get('/assets', authenticateToken, requireRole(['admin']), getAssets);

module.exports = router;