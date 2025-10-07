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
        u.username,
        u.email,
        u.first_name,
        u.last_name
      FROM assets a
      JOIN users u ON a.user_id = u.id
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
            user: {
              username: asset.username,
              email: asset.email,
              first_name: asset.first_name,
              last_name: asset.last_name
            },
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