const express = require('express');
const router = express.Router();
const { 
  getAutoAssignSetting,
  updateAutoAssignSetting,
  getLocales,
  getBookingCategoriesByLocale,
  getDeliverableTypesByCategory,
  getDeliverableTypesByLocale,
  getBatchesByCategory,
  getBatchesByType,
  getUnassignedUsers,
  assignUserToBatch,
  removeUserFromBatch,
  getUserBatches,
  getAllBatches
} = require('../controllers/batchController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Admin routes for batch management
router.get('/auto-assign', authenticateToken, requireRole(['admin']), getAutoAssignSetting);
router.post('/auto-assign', authenticateToken, requireRole(['admin']), updateAutoAssignSetting);
router.get('/locales', authenticateToken, requireRole(['admin']), getLocales);
router.get('/locale/:locale/booking-categories', authenticateToken, requireRole(['admin']), getBookingCategoriesByLocale);
router.get('/locale/:locale/category/:bookingCategory', authenticateToken, requireRole(['admin']), getBatchesByCategory);
// Backward compatibility routes
router.get('/locale/:locale/deliverable-types', authenticateToken, requireRole(['admin']), getDeliverableTypesByLocale);
router.get('/locale/:locale/type/:deliverableType', authenticateToken, requireRole(['admin']), getBatchesByType);
router.get('/unassigned-users', authenticateToken, requireRole(['admin']), getUnassignedUsers);
router.post('/assign-user', authenticateToken, requireRole(['admin']), assignUserToBatch);
router.post('/remove-user', authenticateToken, requireRole(['admin']), removeUserFromBatch);
router.get('/all', authenticateToken, requireRole(['admin']), getAllBatches);

// QC user routes
router.get('/user-batches', authenticateToken, requireRole(['qc_user']), getUserBatches);

module.exports = router;