const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFiles, getUserUploads } = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// Configure multer fields for different file types
const uploadFields = upload.fields([
  { name: 'emlFile', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 },
  { name: 'txtFile', maxCount: 1 }
]);

// Upload files endpoint
router.post('/upload', authenticateToken, uploadFields, uploadFiles);

// Get user's uploads
router.get('/uploads', authenticateToken, getUserUploads);

module.exports = router;