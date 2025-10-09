const express = require('express');
const router = express.Router();
const {
  translateText,
  getSupportedLanguages
} = require('../controllers/translationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Translation routes - accessible to QC users, supervisors, and admins
router.post('/translate', authenticateToken, requireRole(['qc_user', 'supervisor', 'admin']), translateText);
router.get('/languages', authenticateToken, requireRole(['qc_user', 'supervisor', 'admin']), getSupportedLanguages);

module.exports = router;