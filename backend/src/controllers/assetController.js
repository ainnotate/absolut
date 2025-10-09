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

module.exports = {
  getAssets
};