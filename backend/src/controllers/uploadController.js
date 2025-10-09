const crypto = require('crypto');
const AWS = require('aws-sdk');
const path = require('path');
const { db } = require('../models/database');

// Configure AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'absolute-uploads';

// Calculate MD5 hash of a buffer
function calculateMD5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// Generate filename based on metadata format
function generateFilename(userId, metadata, fileType, timestamp) {
  // Clean metadata values to be filesystem-safe
  const cleanValue = (value) => {
    if (!value) return 'unknown';
    return value.toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const locale = cleanValue(metadata.locale);
  const sourceName = cleanValue(metadata.sourceName);
  const bookingType = cleanValue(metadata.bookingType);
  
  // Map category to deliverable type
  let deliverableType;
  switch (fileType) {
    case 'eml':
      deliverableType = 'email';
      break;
    case 'pdf':
      deliverableType = 'pdf';
      break;
    case 'txt':
      deliverableType = 'text';
      break;
    default:
      deliverableType = fileType;
  }

  // Get file extension
  let extension;
  switch (fileType) {
    case 'eml':
      extension = '.eml';
      break;
    case 'pdf':
      extension = '.pdf';
      break;
    case 'txt':
      extension = '.txt';
      break;
    default:
      extension = '.bin';
  }

  return `${userId}_${locale}_${sourceName}_${bookingType}_${deliverableType}_${timestamp}${extension}`;
}

// Check if file with same MD5 exists for user
function checkDuplicate(md5Hash, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM uploads WHERE md5_hash = ? AND user_id = ?',
      [md5Hash, userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row !== undefined);
        }
      }
    );
  });
}

// Upload file to S3
async function uploadToS3(buffer, key, contentType = 'application/octet-stream') {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  };

  try {
    await s3.putObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return false;
  }
}

// Main upload handler
const uploadFiles = async (req, res) => {
  try {
    // Debug logging
    console.log('Upload request received');
    console.log('User:', req.user);
    console.log('User role:', req.user?.role);
    
    // Check if user exists
    if (!req.user) {
      return res.status(401).json({ 
        error: "Authentication required" 
      });
    }
    
    // Check if user has upload_user or admin role
    if (req.user.role !== 'upload_user' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: `You don't have permission to upload files. Your role: ${req.user.role}` 
      });
    }

    const { category, metadata } = req.body;
    const files = req.files;
    
    let metadataObj;
    try {
      metadataObj = JSON.parse(metadata);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid metadata format' });
    }

    // Add deliverable type to metadata based on category
    let deliverableType;
    switch (category) {
      case '.eml':
        deliverableType = 'Raw Email';
        break;
      case '.eml + pdf':
        deliverableType = 'Email + Attachment';
        break;
      case '.txt':
        deliverableType = 'Text Message';
        break;
      default:
        deliverableType = category;
    }
    metadataObj.deliverableType = deliverableType;

    const uploadedFiles = [];
    const fileHashes = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Generate unique Asset ID
    const assetId = `AST_${req.user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Process files based on category
    if (category === '.eml') {
      const emlFile = files.emlFile?.[0];
      if (!emlFile) {
        return res.status(400).json({ error: 'EML file is required' });
      }

      const emlHash = calculateMD5(emlFile.buffer);
      
      // Check for duplicate
      if (await checkDuplicate(emlHash, req.user.id)) {
        return res.status(409).json({ 
          error: `Duplicate file detected: EML file with hash ${emlHash} already exists` 
        });
      }

      fileHashes.eml = emlHash;

      // Generate custom filename and upload to S3
      const customFilename = generateFilename(req.user.id, metadataObj, 'eml', timestamp);
      const s3Key = `${req.user.id}/${metadataObj.locale}/${customFilename}`;
      
      if (!await uploadToS3(emlFile.buffer, s3Key, 'message/rfc822')) {
        return res.status(500).json({ error: 'Failed to upload EML file to storage' });
      }

      uploadedFiles.push({
        filename: customFilename,
        type: 'eml',
        s3Key: s3Key,
        md5Hash: emlHash,
        assetId: assetId
      });

    } else if (category === '.eml + pdf') {
      const emlFile = files.emlFile?.[0];
      const pdfFile = files.pdfFile?.[0];

      if (!emlFile || !pdfFile) {
        return res.status(400).json({ 
          error: 'Both EML and PDF files are required' 
        });
      }

      const emlHash = calculateMD5(emlFile.buffer);
      const pdfHash = calculateMD5(pdfFile.buffer);

      // Check for duplicates
      if (await checkDuplicate(emlHash, req.user.id)) {
        return res.status(409).json({ 
          error: `Duplicate file detected: EML file with hash ${emlHash} already exists` 
        });
      }

      if (await checkDuplicate(pdfHash, req.user.id)) {
        return res.status(409).json({ 
          error: `Duplicate file detected: PDF file with hash ${pdfHash} already exists` 
        });
      }

      fileHashes.eml = emlHash;
      fileHashes.pdf = pdfHash;

      // Generate custom filenames and upload to S3
      const emlCustomFilename = generateFilename(req.user.id, metadataObj, 'eml', timestamp);
      const pdfCustomFilename = generateFilename(req.user.id, metadataObj, 'pdf', timestamp);
      const emlS3Key = `${req.user.id}/${metadataObj.locale}/${emlCustomFilename}`;
      const pdfS3Key = `${req.user.id}/${metadataObj.locale}/${pdfCustomFilename}`;

      if (!await uploadToS3(emlFile.buffer, emlS3Key, 'message/rfc822')) {
        return res.status(500).json({ error: 'Failed to upload EML file to storage' });
      }

      if (!await uploadToS3(pdfFile.buffer, pdfS3Key, 'application/pdf')) {
        // Cleanup EML if PDF fails
        try {
          await s3.deleteObject({ Bucket: BUCKET_NAME, Key: emlS3Key }).promise();
        } catch (e) {
          console.error('Failed to cleanup EML file:', e);
        }
        return res.status(500).json({ error: 'Failed to upload PDF file to storage' });
      }

      uploadedFiles.push(
        {
          filename: emlCustomFilename,
          type: 'eml',
          s3Key: emlS3Key,
          md5Hash: emlHash,
          assetId: assetId
        },
        {
          filename: pdfCustomFilename,
          type: 'pdf',
          s3Key: pdfS3Key,
          md5Hash: pdfHash,
          assetId: assetId
        }
      );

    } else if (category === '.txt') {
      const txtFile = files.txtFile?.[0];
      const { textContent } = req.body;

      let txtBuffer;

      if (txtFile) {
        txtBuffer = txtFile.buffer;
      } else if (textContent) {
        txtBuffer = Buffer.from(textContent, 'utf-8');
      } else {
        return res.status(400).json({ 
          error: 'Either TXT file or text content is required' 
        });
      }

      const txtHash = calculateMD5(txtBuffer);

      // Check for duplicate
      if (await checkDuplicate(txtHash, req.user.id)) {
        return res.status(409).json({ 
          error: `Duplicate content detected: Text with hash ${txtHash} already exists` 
        });
      }

      fileHashes.txt = txtHash;

      // Generate custom filename and upload to S3
      const customFilename = generateFilename(req.user.id, metadataObj, 'txt', timestamp);
      const s3Key = `${req.user.id}/${metadataObj.locale}/${customFilename}`;

      if (!await uploadToS3(txtBuffer, s3Key, 'text/plain')) {
        return res.status(500).json({ error: 'Failed to upload text file to storage' });
      }

      uploadedFiles.push({
        filename: customFilename,
        type: 'txt',
        s3Key: s3Key,
        md5Hash: txtHash,
        assetId: assetId
      });
    }

    // All files uploaded successfully to S3, now create database records in transaction
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Create asset record
        db.run(
          `INSERT INTO assets (asset_id, user_id, deliverable_type, metadata) 
           VALUES (?, ?, ?, ?)`,
          [
            assetId,
            req.user.id,
            deliverableType,
            JSON.stringify(metadataObj)
          ],
          function(err) {
            if (err) {
              console.error('Error creating asset:', err);
              db.run('ROLLBACK');
              return reject(err);
            }

            // Insert upload records
            let pendingInserts = uploadedFiles.length;
            let hasError = false;

            if (pendingInserts === 0) {
              db.run('COMMIT');
              return resolve();
            }

            uploadedFiles.forEach((fileInfo) => {
              db.run(
                `INSERT INTO uploads (asset_id, user_id, filename, file_type, category, s3_key, md5_hash, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  fileInfo.assetId,
                  req.user.id,
                  fileInfo.filename,
                  fileInfo.type,
                  category,
                  fileInfo.s3Key,
                  fileInfo.md5Hash,
                  JSON.stringify(metadataObj)
                ],
                function(err) {
                  if (err && !hasError) {
                    hasError = true;
                    console.error('Error creating upload record:', err);
                    db.run('ROLLBACK');
                    return reject(err);
                  }

                  pendingInserts--;
                  if (pendingInserts === 0 && !hasError) {
                    db.run('COMMIT');
                    resolve();
                  }
                }
              );
            });
          }
        );
      });
    });

    res.status(201).json({
      message: 'Files uploaded successfully',
      assetId: assetId,
      deliverableType: deliverableType,
      uploadedFiles: uploadedFiles,
      metadata: metadataObj
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'An error occurred during upload',
      details: error.message 
    });
  }
};

// Get user's uploads
const getUserUploads = async (req, res) => {
  try {
    db.all(
      `SELECT 
        u.id, u.filename, u.file_type, u.s3_key, u.md5_hash, u.upload_date,
        a.asset_id, a.deliverable_type, a.metadata, a.created_date
       FROM uploads u 
       JOIN assets a ON u.asset_id = a.asset_id 
       WHERE u.user_id = ? 
       ORDER BY a.created_date DESC, u.upload_date ASC`,
      [req.user.id],
      (err, uploads) => {
        if (err) {
          console.error('Error fetching uploads:', err);
          return res.status(500).json({ 
            error: 'Failed to fetch uploads' 
          });
        }

        const formattedUploads = uploads.map(upload => ({
          id: upload.id,
          assetId: upload.asset_id,
          filename: upload.filename,
          fileType: upload.file_type,
          deliverableType: upload.deliverable_type,
          s3Key: upload.s3_key,
          md5Hash: upload.md5_hash,
          metadata: upload.metadata ? JSON.parse(upload.metadata) : {},
          uploadDate: upload.upload_date,
          assetCreatedDate: upload.created_date
        }));

        res.json({ uploads: formattedUploads });
      }
    );
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ 
      error: 'Failed to fetch uploads' 
    });
  }
};

module.exports = {
  uploadFiles,
  getUserUploads
};