const express = require('express');
const router = express.Router();
const {
  getStatistics,
  getAssets,
  getFilterOptions,
  getAssetDetails,
  updateAssetStatus
} = require('../controllers/supervisorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Supervisor routes
router.get('/statistics', authenticateToken, requireRole(['supervisor', 'admin']), getStatistics);
router.get('/assets', authenticateToken, requireRole(['supervisor', 'admin']), getAssets);
router.get('/filter-options', authenticateToken, requireRole(['supervisor', 'admin']), getFilterOptions);
router.get('/assets/:assetId', authenticateToken, requireRole(['supervisor', 'admin']), getAssetDetails);
router.put('/assets/:assetId/status', authenticateToken, requireRole(['supervisor', 'admin']), updateAssetStatus);

module.exports = router;