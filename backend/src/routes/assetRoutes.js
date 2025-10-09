const express = require('express');
const router = express.Router();
const { getAssets, resetAndReassignAssets } = require('../controllers/assetController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all assets (admin only)
router.get('/assets', authenticateToken, requireRole(['admin']), getAssets);

// Reset and reassign assets (admin only)
router.post('/admin/reset-reassign', authenticateToken, requireRole(['admin']), resetAndReassignAssets);

module.exports = router;