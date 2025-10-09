const { db } = require('../models/database');
const AWS = require('aws-sdk');
const pdfParse = require('pdf-parse');

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Get assigned assets for QC user
const getAssignedAssets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { batchId, status = 'pending' } = req.query;

    let query = `
      SELECT 
        a.*,
        u.username as uploader_username,
        u.email as uploader_email,
        GROUP_CONCAT(
          json_object(
            'id', up.id,
            'filename', up.filename,
            'file_type', up.file_type,
            's3_key', up.s3_key
          )
        ) as files
      FROM assets a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN uploads up ON a.asset_id = up.asset_id
      WHERE a.assigned_to = ?
    `;

    const params = [userId];

    if (batchId) {
      query += ' AND a.batch_id = ?';
      params.push(batchId);
    }

    if (status) {
      query += ' AND a.qc_status = ?';
      params.push(status);
    }

    query += ' GROUP BY a.id ORDER BY a.created_date DESC';

    db.all(query, params, (err, assets) => {
      if (err) {
        console.error('Error fetching assigned assets:', err);
        return res.status(500).json({ error: 'Failed to fetch assigned assets' });
      }

      // Parse files JSON
      const assetsWithFiles = assets.map(asset => ({
        ...asset,
        metadata: asset.metadata ? JSON.parse(asset.metadata) : null,
        files: asset.files ? JSON.parse(`[${asset.files}]`) : []
      }));

      res.json({ assets: assetsWithFiles });
    });
  } catch (error) {
    console.error('Error getting assigned assets:', error);
    res.status(500).json({ error: 'Failed to get assigned assets' });
  }
};

// Get next asset for QC
const getNextAsset = async (req, res) => {
  try {
    const userId = req.user.id;
    const { batchId } = req.params;

    db.get(
      `SELECT 
        a.*,
        u.username as uploader_username,
        u.email as uploader_email
      FROM assets a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.assigned_to = ? 
        AND a.batch_id = ? 
        AND (a.qc_status = 'pending' OR a.qc_status = 'in_progress' OR a.qc_status IS NULL)
      ORDER BY a.created_date ASC
      LIMIT 1`,
      [userId, batchId],
      (err, asset) => {
        if (err) {
          console.error('Error fetching next asset:', err);
          return res.status(500).json({ error: 'Failed to fetch next asset' });
        }

        if (!asset) {
          return res.json({ asset: null, files: [], hasNext: false });
        }

        // Get files for this asset
        db.all(
          `SELECT * FROM uploads WHERE asset_id = ?`,
          [asset.asset_id],
          (err, files) => {
            if (err) {
              console.error('Error fetching files:', err);
              return res.status(500).json({ error: 'Failed to fetch files' });
            }

            // Check if there are more assets
            db.get(
              `SELECT COUNT(*) as count 
               FROM assets 
               WHERE assigned_to = ? 
                 AND batch_id = ? 
                 AND (qc_status = 'pending' OR qc_status IS NULL)
                 AND id > ?`,
              [userId, batchId, asset.id],
              (err, countResult) => {
                if (err) {
                  console.error('Error checking next assets:', err);
                }

                // Update status to in_progress
                db.run(
                  `UPDATE assets SET qc_status = 'in_progress' WHERE id = ?`,
                  [asset.id],
                  (err) => {
                    if (err) console.error('Error updating asset status:', err);
                  }
                );

                res.json({
                  asset: {
                    ...asset,
                    metadata: asset.metadata ? JSON.parse(asset.metadata) : null
                  },
                  files,
                  hasNext: countResult ? countResult.count > 0 : false
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Error getting next asset:', error);
    res.status(500).json({ error: 'Failed to get next asset' });
  }
};

// Get file content from S3
const getFileContent = async (req, res) => {
  try {
    const { s3Key } = req.params;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key
    };

    s3.getObject(params, (err, data) => {
      if (err) {
        console.error('Error fetching file from S3:', err);
        return res.status(500).json({ error: 'Failed to fetch file' });
      }

      // Set appropriate content type and headers
      const fileExtension = s3Key.split('.').pop().toLowerCase();
      let contentType = 'text/plain';
      
      if (fileExtension === 'eml') {
        contentType = 'message/rfc822';
      } else if (fileExtension === 'pdf') {
        contentType = 'application/pdf';
        // Add headers to allow PDF display inline
        res.set('Content-Disposition', 'inline; filename="' + s3Key.split('/').pop() + '"');
        // Remove X-Frame-Options to allow embedding
        res.removeHeader('X-Frame-Options');
      }

      res.set('Content-Type', contentType);
      res.send(data.Body);
    });
  } catch (error) {
    console.error('Error getting file content:', error);
    res.status(500).json({ error: 'Failed to get file content' });
  }
};

// Get signed URL for file download
const getFileUrl = async (req, res) => {
  try {
    const { s3Key } = req.params;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Expires: 3600 // URL expires in 1 hour
    };

    s3.getSignedUrl('getObject', params, (err, url) => {
      if (err) {
        console.error('Error generating signed URL:', err);
        return res.status(500).json({ error: 'Failed to generate file URL' });
      }

      res.json({ url });
    });
  } catch (error) {
    console.error('Error getting file URL:', error);
    res.status(500).json({ error: 'Failed to get file URL' });
  }
};

// Submit QC review
const submitQCReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { assetId } = req.params;
    const { 
      action, // 'approved' or 'rejected'
      rejectReason,
      updatedMetadata,
      sendToSupervisor,
      notes
    } = req.body;

    // Validate action
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    db.serialize(() => {
      // Get current asset data
      db.get(
        `SELECT * FROM assets WHERE asset_id = ?`,
        [assetId],
        (err, asset) => {
          if (err) {
            console.error('Error fetching asset:', err);
            return res.status(500).json({ error: 'Failed to fetch asset' });
          }

          if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
          }

          // Create QC submission record
          db.run(
            `INSERT INTO qc_submissions 
             (asset_id, qc_user_id, action, reject_reason, metadata_before, metadata_after, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              assetId,
              userId,
              action,
              rejectReason || null,
              asset.metadata,
              updatedMetadata ? JSON.stringify(updatedMetadata) : asset.metadata
            ],
            function(err) {
              if (err) {
                console.error('Error creating QC submission:', err);
                return res.status(500).json({ error: 'Failed to create QC submission' });
              }

              // Update asset
              const qcStatus = action === 'approved' ? 'approved' : 'rejected';
              const supervisorStatus = sendToSupervisor ? 'pending' : null;

              db.run(
                `UPDATE assets 
                 SET qc_status = ?,
                     qc_completed_by = ?,
                     qc_completed_date = CURRENT_TIMESTAMP,
                     qc_notes = ?,
                     metadata = ?,
                     send_to_supervisor = ?,
                     supervisor_status = ?
                 WHERE asset_id = ?`,
                [
                  qcStatus,
                  userId,
                  notes || null,
                  updatedMetadata ? JSON.stringify(updatedMetadata) : asset.metadata,
                  sendToSupervisor ? 1 : 0,
                  supervisorStatus,
                  assetId
                ],
                function(err) {
                  if (err) {
                    console.error('Error updating asset:', err);
                    return res.status(500).json({ error: 'Failed to update asset' });
                  }

                  // Update batch assignment completed count
                  if (action === 'approved') {
                    db.run(
                      `UPDATE batch_assignments 
                       SET completed_assets = completed_assets + 1
                       WHERE batch_id = ? AND user_id = ?`,
                      [asset.batch_id, userId],
                      (err) => {
                        if (err) console.error('Error updating batch completion count:', err);
                      }
                    );
                  }

                  res.json({ 
                    success: true,
                    submissionId: this.lastID,
                    message: `Asset ${action} successfully`
                  });
                }
              );
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Error submitting QC review:', error);
    res.status(500).json({ error: 'Failed to submit QC review' });
  }
};

// Extract text from PDF file
const extractPdfText = async (req, res) => {
  try {
    const { s3Key } = req.params;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key
    };

    s3.getObject(params, async (err, data) => {
      if (err) {
        console.error('Error fetching PDF from S3:', err);
        return res.status(500).json({ error: 'Failed to fetch PDF file' });
      }

      try {
        // Extract text from PDF buffer
        const pdfData = await pdfParse(data.Body);
        
        res.json({ 
          text: pdfData.text,
          pages: pdfData.numpages,
          info: pdfData.info
        });
      } catch (parseError) {
        console.error('Error parsing PDF:', parseError);
        res.status(500).json({ error: 'Failed to extract text from PDF' });
      }
    });
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    res.status(500).json({ error: 'Failed to extract PDF text' });
  }
};

// Get QC statistics
const getQCStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        COUNT(*) as total_assigned,
        COUNT(CASE WHEN qc_status = 'pending' OR qc_status IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN qc_status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN qc_status = 'approved' THEN 1 END) as completed,
        COUNT(CASE WHEN qc_status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN send_to_supervisor = 1 THEN 1 END) as sent_to_supervisor
      FROM assets
      WHERE assigned_to = ?
    `;

    db.get(query, [userId], (err, stats) => {
      if (err) {
        console.error('Error fetching QC stats:', err);
        return res.status(500).json({ error: 'Failed to fetch QC statistics' });
      }

      res.json({ stats });
    });
  } catch (error) {
    console.error('Error getting QC stats:', error);
    res.status(500).json({ error: 'Failed to get QC statistics' });
  }
};

module.exports = {
  getAssignedAssets,
  getNextAsset,
  getFileContent,
  getFileUrl,
  submitQCReview,
  getQCStats,
  extractPdfText
};