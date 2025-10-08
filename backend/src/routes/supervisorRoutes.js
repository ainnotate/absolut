const express = require('express');
const router = express.Router();
const {
  getAssetsForReview,
  getNextAssetForReview,
  submitSupervisorReview,
  getSupervisorStats,
  getQCPerformance
} = require('../controllers/supervisorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Supervisor routes
router.get('/review-queue', authenticateToken, requireRole(['supervisor']), getAssetsForReview);
router.get('/next-review', authenticateToken, requireRole(['supervisor']), getNextAssetForReview);
router.post('/review/:assetId', authenticateToken, requireRole(['supervisor']), submitSupervisorReview);
router.get('/stats', authenticateToken, requireRole(['supervisor', 'admin']), getSupervisorStats);
router.get('/qc-performance', authenticateToken, requireRole(['supervisor', 'admin']), getQCPerformance);

module.exports = router;