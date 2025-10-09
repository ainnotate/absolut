const express = require('express');
const router = express.Router();
const {
  getAssignedAssets,
  getNextAsset,
  getFileContent,
  getFileUrl,
  submitQCReview,
  getQCStats,
  extractPdfText
} = require('../controllers/qcController');
const { authenticateToken, authenticateTokenFromQuery, requireRole } = require('../middleware/auth');

// QC user routes
router.get('/assigned', authenticateToken, requireRole(['qc_user']), getAssignedAssets);
router.get('/batch/:batchId/next', authenticateToken, requireRole(['qc_user']), getNextAsset);
router.get('/file/:s3Key(*)', authenticateTokenFromQuery, requireRole(['qc_user', 'supervisor', 'admin']), getFileContent);
router.get('/file-url/:s3Key(*)', authenticateTokenFromQuery, requireRole(['qc_user', 'supervisor', 'admin']), getFileUrl);
router.get('/pdf-text/:s3Key(*)', authenticateToken, requireRole(['qc_user', 'supervisor', 'admin']), extractPdfText);
router.post('/review/:assetId', authenticateToken, requireRole(['qc_user']), submitQCReview);
router.get('/stats', authenticateToken, requireRole(['qc_user']), getQCStats);

module.exports = router;