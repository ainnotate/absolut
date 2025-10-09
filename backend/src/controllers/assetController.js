const { db } = require('../models/database');

const getAssets = async (req, res) => {
  try {
    // Get all assets with user information
    db.all(`
      SELECT 
        a.id,
        a.asset_id,
        a.user_id,
        a.deliverable_type,
        a.metadata,
        a.created_date,
        a.batch_id,
        a.assigned_to,
        a.qc_status,
        a.qc_completed_by,
        a.qc_completed_date,
        a.qc_notes,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        qc_user.username as qc_username,
        qc_user.email as qc_email,
        qc_user.first_name as qc_first_name,
        qc_user.last_name as qc_last_name
      FROM assets a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN users qc_user ON a.assigned_to = qc_user.id
      ORDER BY a.created_date DESC
    `, [], (err, assets) => {
      if (err) {
        console.error('Error fetching assets:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch assets'
        });
      }

      if (assets.length === 0) {
        return res.json({
          success: true,
          assets: []
        });
      }

      // For each asset, get its associated files
      let processedAssets = 0;
      const assetsWithFiles = [];

      assets.forEach((asset, index) => {
        db.all(`
          SELECT 
            id,
            filename,
            file_type,
            s3_key,
            md5_hash,
            upload_date
          FROM uploads
          WHERE asset_id = ?
          ORDER BY upload_date ASC
        `, [asset.asset_id], (err, files) => {
          if (err) {
            console.error('Error fetching files for asset:', err);
            files = [];
          }

          assetsWithFiles[index] = {
            id: asset.id,
            assetId: asset.asset_id,
            userId: asset.user_id,
            deliverableType: asset.deliverable_type,
            metadata: asset.metadata ? JSON.parse(asset.metadata) : null,
            createdDate: asset.created_date,
            batch_id: asset.batch_id,
            assigned_to: asset.assigned_to,
            qc_status: asset.qc_status,
            qc_completed_by: asset.qc_completed_by,
            qc_completed_date: asset.qc_completed_date,
            qc_notes: asset.qc_notes,
            user: {
              username: asset.username,
              email: asset.email,
              first_name: asset.first_name,
              last_name: asset.last_name
            },
            qc_user: asset.qc_username ? {
              username: asset.qc_username,
              email: asset.qc_email,
              first_name: asset.qc_first_name,
              last_name: asset.qc_last_name
            } : null,
            files: files.map(file => ({
              id: file.id,
              filename: file.filename,
              fileType: file.file_type,
              s3Key: file.s3_key,
              md5Hash: file.md5_hash,
              uploadDate: file.upload_date
            }))
          };

          processedAssets++;
          if (processedAssets === assets.length) {
            res.json({
              success: true,
              assets: assetsWithFiles
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assets'
    });
  }
};

const resetAndReassignAssets = async (req, res) => {
  try {
    const { currentUser, locale, bookingCategory, newUser } = req.body;

    if (!currentUser || !locale || !bookingCategory || !newUser) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: currentUser, locale, bookingCategory, newUser'
      });
    }

    // Get user details for response
    const getUserQuery = `SELECT username FROM users WHERE id = ?`;
    
    db.get(getUserQuery, [newUser], (err, user) => {
      if (err) {
        console.error('Error fetching new user:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user details'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'New user not found'
        });
      }

      // Build the WHERE clause for filtering assets
      let whereClause = `WHERE assigned_to = ?`;
      let params = [currentUser];

      // Add locale filter - check both JSON and text metadata
      whereClause += ` AND (
        (metadata LIKE ? OR metadata LIKE ?)
      )`;
      params.push(`%"locale":"${locale}"%`);
      params.push(`%"locale": "${locale}"%`);

      // Add booking category filter
      whereClause += ` AND (
        (metadata LIKE ? OR metadata LIKE ?)
      )`;
      params.push(`%"bookingCategory":"${bookingCategory}"%`);
      params.push(`%"bookingCategory": "${bookingCategory}"%`);

      // First, get count of matching assets
      const countQuery = `
        SELECT COUNT(*) as count
        FROM assets
        ${whereClause}
      `;

      db.get(countQuery, params, (err, countResult) => {
        if (err) {
          console.error('Error counting assets:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to count matching assets'
          });
        }

        const affectedCount = countResult.count;

        if (affectedCount === 0) {
          return res.json({
            success: true,
            message: 'No assets found matching the specified criteria',
            affectedAssets: 0,
            newUserName: user.username
          });
        }

        // First, get the existing batch assignments for these assets
        const getBatchQuery = `
          SELECT DISTINCT batch_id
          FROM assets
          ${whereClause}
          AND batch_id IS NOT NULL
        `;

        db.all(getBatchQuery, params, (err, existingBatches) => {
          if (err) {
            console.error('Error fetching existing batches:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to fetch existing batch information'
            });
          }

          // Reset QC status and reassign assets (keep existing batch_id if exists)
          const updateQuery = `
            UPDATE assets
            SET 
              assigned_to = ?,
              qc_status = 'pending',
              qc_completed_by = NULL,
              qc_completed_date = NULL,
              qc_notes = NULL
            ${whereClause}
          `;

          const updateParams = [newUser, ...params];

          db.run(updateQuery, updateParams, function(err) {
            if (err) {
              console.error('Error updating assets:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to reset and reassign assets'
              });
            }

            // Update existing batch assignments to point to the new user
            if (existingBatches.length > 0) {
              let batchUpdatesCompleted = 0;
              const totalBatchUpdates = existingBatches.length;

              existingBatches.forEach(batch => {
                const updateBatchQuery = `
                  UPDATE batch_assignments 
                  SET user_id = ?, assigned_by = ?, assigned_at = CURRENT_TIMESTAMP,
                      assigned_assets = ?, completed_assets = 0
                  WHERE batch_id = ?
                `;

                db.run(updateBatchQuery, [newUser, req.user.id, affectedCount, batch.batch_id], (batchErr) => {
                  if (batchErr) {
                    console.error('Error updating batch assignment:', batchErr);
                  }
                  
                  batchUpdatesCompleted++;
                  if (batchUpdatesCompleted === totalBatchUpdates) {
                    res.json({
                      success: true,
                      message: `Successfully reset and reassigned ${affectedCount} assets in ${totalBatchUpdates} batch(es)`,
                      affectedAssets: affectedCount,
                      newUserName: user.username,
                      updatedBatches: existingBatches.map(b => b.batch_id)
                    });
                  }
                });
              });
            } else {
              // No existing batches, create a new one
              const batchId = `${locale}_${bookingCategory}_${Date.now()}`.replace(/\s+/g, '_');
              
              // Update assets with new batch_id
              const setBatchQuery = `
                UPDATE assets 
                SET batch_id = ?
                ${whereClause}
              `;
              
              db.run(setBatchQuery, [batchId, ...params], (setBatchErr) => {
                if (setBatchErr) {
                  console.error('Error setting batch_id:', setBatchErr);
                }

                // Create new batch assignment
                const insertBatchQuery = `
                  INSERT INTO batch_assignments 
                  (batch_id, locale, booking_category, user_id, total_assets, assigned_assets, assigned_by)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                db.run(insertBatchQuery, [
                  batchId,
                  locale,
                  bookingCategory,
                  newUser,
                  affectedCount,
                  affectedCount,
                  req.user.id
                ], (batchErr) => {
                  if (batchErr) {
                    console.error('Error creating batch assignment:', batchErr);
                  }

                  res.json({
                    success: true,
                    message: `Successfully reset and reassigned ${affectedCount} assets to new batch ${batchId}`,
                    affectedAssets: affectedCount,
                    newUserName: user.username,
                    batchId: batchId
                  });
                });
              });
            }
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in resetAndReassignAssets:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  getAssets,
  resetAndReassignAssets
};