const { db } = require('../models/database');

// Get assets for supervisor review
const getAssetsForReview = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const query = `
      SELECT 
        a.*,
        u.username as uploader_username,
        u.email as uploader_email,
        qc.username as qc_username,
        qc.email as qc_email,
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
      LEFT JOIN users qc ON a.qc_completed_by = qc.id
      LEFT JOIN uploads up ON a.asset_id = up.asset_id
      WHERE a.send_to_supervisor = 1
    `;

    const params = [];

    if (status) {
      query += ' AND a.supervisor_status = ?';
      params.push(status);
    }

    query += ' GROUP BY a.id ORDER BY a.qc_completed_date DESC';

    db.all(query, params, (err, assets) => {
      if (err) {
        console.error('Error fetching supervisor assets:', err);
        return res.status(500).json({ error: 'Failed to fetch assets for review' });
      }

      // Parse files JSON and metadata
      const assetsWithFiles = assets.map(asset => ({
        ...asset,
        metadata: asset.metadata ? JSON.parse(asset.metadata) : null,
        files: asset.files ? JSON.parse(`[${asset.files}]`) : []
      }));

      res.json({ assets: assetsWithFiles });
    });
  } catch (error) {
    console.error('Error getting supervisor assets:', error);
    res.status(500).json({ error: 'Failed to get assets for review' });
  }
};

// Get next asset for supervisor review
const getNextAssetForReview = async (req, res) => {
  try {
    db.get(
      `SELECT 
        a.*,
        u.username as uploader_username,
        u.email as uploader_email,
        qc.username as qc_username,
        qc.email as qc_email,
        qs.action as qc_action,
        qs.reject_reason as qc_reject_reason,
        qs.metadata_before,
        qs.metadata_after
      FROM assets a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users qc ON a.qc_completed_by = qc.id
      LEFT JOIN qc_submissions qs ON qs.asset_id = a.asset_id AND qs.qc_user_id = a.qc_completed_by
      WHERE a.send_to_supervisor = 1 
        AND (a.supervisor_status = 'pending' OR a.supervisor_status IS NULL)
      ORDER BY a.qc_completed_date ASC
      LIMIT 1`,
      [],
      (err, asset) => {
        if (err) {
          console.error('Error fetching next asset for review:', err);
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
               WHERE send_to_supervisor = 1 
                 AND (supervisor_status = 'pending' OR supervisor_status IS NULL)
                 AND id > ?`,
              [asset.id],
              (err, countResult) => {
                if (err) {
                  console.error('Error checking next assets:', err);
                }

                res.json({
                  asset: {
                    ...asset,
                    metadata: asset.metadata ? JSON.parse(asset.metadata) : null,
                    metadata_before: asset.metadata_before ? JSON.parse(asset.metadata_before) : null,
                    metadata_after: asset.metadata_after ? JSON.parse(asset.metadata_after) : null
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
    console.error('Error getting next asset for review:', error);
    res.status(500).json({ error: 'Failed to get next asset for review' });
  }
};

// Submit supervisor review
const submitSupervisorReview = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const { assetId } = req.params;
    const { 
      action, // 'approved', 'rejected', or 'consulted'
      notes,
      updatedMetadata
    } = req.body;

    // Validate action
    if (!['approved', 'rejected', 'consulted'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    db.serialize(() => {
      // Create supervisor review record
      db.run(
        `INSERT INTO supervisor_reviews 
         (asset_id, supervisor_id, action, notes, reviewed_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [assetId, supervisorId, action, notes || null],
        function(err) {
          if (err) {
            console.error('Error creating supervisor review:', err);
            return res.status(500).json({ error: 'Failed to create supervisor review' });
          }

          // Update asset
          let updateQuery = `
            UPDATE assets 
            SET supervisor_status = ?,
                supervisor_reviewed_by = ?,
                supervisor_reviewed_date = CURRENT_TIMESTAMP,
                supervisor_notes = ?
          `;

          const updateParams = [action, supervisorId, notes || null];

          // If metadata was updated, include it
          if (updatedMetadata) {
            updateQuery += ', metadata = ?';
            updateParams.push(JSON.stringify(updatedMetadata));
          }

          updateQuery += ' WHERE asset_id = ?';
          updateParams.push(assetId);

          db.run(updateQuery, updateParams, function(err) {
            if (err) {
              console.error('Error updating asset:', err);
              return res.status(500).json({ error: 'Failed to update asset' });
            }

            res.json({ 
              success: true,
              reviewId: this.lastID,
              message: `Asset ${action} by supervisor`
            });
          });
        }
      );
    });
  } catch (error) {
    console.error('Error submitting supervisor review:', error);
    res.status(500).json({ error: 'Failed to submit supervisor review' });
  }
};

// Get supervisor statistics
const getSupervisorStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(CASE WHEN send_to_supervisor = 1 THEN 1 END) as total_for_review,
        COUNT(CASE WHEN send_to_supervisor = 1 AND (supervisor_status = 'pending' OR supervisor_status IS NULL) THEN 1 END) as pending_review,
        COUNT(CASE WHEN supervisor_status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN supervisor_status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN supervisor_status = 'consulted' THEN 1 END) as consulted
      FROM assets
    `;

    db.get(query, [], (err, stats) => {
      if (err) {
        console.error('Error fetching supervisor stats:', err);
        return res.status(500).json({ error: 'Failed to fetch supervisor statistics' });
      }

      // Also get recent reviews by this supervisor
      const supervisorId = req.user.id;
      db.get(
        `SELECT 
          COUNT(*) as my_reviews,
          COUNT(CASE WHEN action = 'approved' THEN 1 END) as my_approved,
          COUNT(CASE WHEN action = 'rejected' THEN 1 END) as my_rejected,
          COUNT(CASE WHEN action = 'consulted' THEN 1 END) as my_consulted
        FROM supervisor_reviews
        WHERE supervisor_id = ?`,
        [supervisorId],
        (err, myStats) => {
          if (err) {
            console.error('Error fetching my supervisor stats:', err);
            return res.status(200).json({ stats });
          }

          res.json({ 
            stats: {
              ...stats,
              myReviews: myStats
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Error getting supervisor stats:', error);
    res.status(500).json({ error: 'Failed to get supervisor statistics' });
  }
};

// Get QC users' performance
const getQCPerformance = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        COUNT(DISTINCT a.id) as total_reviewed,
        COUNT(CASE WHEN a.qc_status = 'completed' THEN 1 END) as approved,
        COUNT(CASE WHEN a.qc_status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN a.send_to_supervisor = 1 THEN 1 END) as sent_to_supervisor,
        COUNT(CASE WHEN a.supervisor_status = 'approved' THEN 1 END) as supervisor_approved,
        COUNT(CASE WHEN a.supervisor_status = 'rejected' THEN 1 END) as supervisor_rejected
      FROM users u
      LEFT JOIN assets a ON a.qc_completed_by = u.id
      WHERE u.role = 'qc_user'
      GROUP BY u.id
      ORDER BY total_reviewed DESC
    `;

    db.all(query, [], (err, performance) => {
      if (err) {
        console.error('Error fetching QC performance:', err);
        return res.status(500).json({ error: 'Failed to fetch QC performance' });
      }

      res.json({ performance });
    });
  } catch (error) {
    console.error('Error getting QC performance:', error);
    res.status(500).json({ error: 'Failed to get QC performance' });
  }
};

module.exports = {
  getAssetsForReview,
  getNextAssetForReview,
  submitSupervisorReview,
  getSupervisorStats,
  getQCPerformance
};