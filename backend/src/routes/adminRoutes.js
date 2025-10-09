const express = require('express');
const router = express.Router();
const {
  exportQCResults,
  getExportStats
} = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Export routes (admin only)
router.get('/export/qc-results', authenticateToken, requireRole(['admin']), exportQCResults);
router.get('/export/stats', authenticateToken, requireRole(['admin']), getExportStats);

module.exports = router;