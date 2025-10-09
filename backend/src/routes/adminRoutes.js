const express = require('express');
const router = express.Router();
const {
  exportQCResults,
  getExportStats,
  getExportFilterOptions,
  getProgressStats,
  getLocaleProgress,
  getDateProgress,
  getUserPerformance
} = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Export routes (admin only)
router.get('/export/qc-results', authenticateToken, requireRole(['admin']), exportQCResults);
router.get('/export/stats', authenticateToken, requireRole(['admin']), getExportStats);
router.get('/export/filter-options', authenticateToken, requireRole(['admin']), getExportFilterOptions);

// Progress tracking routes (admin only)
router.get('/progress/stats', authenticateToken, requireRole(['admin']), getProgressStats);
router.get('/progress/locale', authenticateToken, requireRole(['admin']), getLocaleProgress);
router.get('/progress/date', authenticateToken, requireRole(['admin']), getDateProgress);
router.get('/progress/users', authenticateToken, requireRole(['admin']), getUserPerformance);

module.exports = router;