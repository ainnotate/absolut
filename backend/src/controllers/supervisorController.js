const { db } = require('../models/database');

// Get supervisor dashboard statistics
const getStatistics = async (req, res) => {
  try {
    const statistics = await new Promise((resolve, reject) => {
      db.serialize(() => {
        const stats = {};

        // Get total assets
        db.get(
          'SELECT COUNT(*) as count FROM assets',
          (err, result) => {
            if (err) return reject(err);
            stats.total_assets = result.count;

            // Get pending QC
            db.get(
              'SELECT COUNT(*) as count FROM assets WHERE assigned_to IS NOT NULL AND qc_status IS NULL',
              (err, result) => {
                if (err) return reject(err);
                stats.pending_qc = result.count;

                // Get completed QC count
                db.get(
                  'SELECT COUNT(*) as count FROM assets WHERE qc_status IS NOT NULL',
                  (err, result) => {
                    if (err) return reject(err);
                    stats.completed_qc = result.count;

                    // Get approved count
                    db.get(
                      'SELECT COUNT(*) as count FROM assets WHERE qc_status = ?',
                      ['approved'],
                      (err, result) => {
                        if (err) return reject(err);
                        stats.approved = result.count;

                        // Get rejected count
                        db.get(
                          'SELECT COUNT(*) as count FROM assets WHERE qc_status = ?',
                          ['rejected'],
                          (err, result) => {
                            if (err) return reject(err);
                            stats.rejected = result.count;

                            // Get supervisor review requested count (total flagged for review)
                            db.get(
                              'SELECT COUNT(*) as count FROM assets WHERE supervisor_review_requested = 1',
                              (err, result) => {
                                if (err) return reject(err);
                                stats.review_requested = result.count;
                                
                                // Get pending supervisor review count (flagged but not reviewed yet)
                                db.get(
                                  'SELECT COUNT(*) as count FROM assets WHERE supervisor_review_requested = 1 AND supervisor_reviewed_by IS NULL',
                                  (err, result) => {
                                    if (err) return reject(err);
                                    stats.pending_supervisor_review = result.count;
                                    resolve(stats);
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });

    res.json({ statistics });
  } catch (error) {
    console.error('Error fetching supervisor statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Get assets with filtering and pagination for supervisor review
const getAssets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      qc_status,
      qc_user,
      deliverable_type,
      supervisor_review_requested
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = [];
    let params = [];

    // Build WHERE conditions
    if (search) {
      whereConditions.push('a.asset_id LIKE ?');
      params.push(`%${search}%`);
    }

    if (qc_status && qc_status !== 'all') {
      if (qc_status === 'pending') {
        whereConditions.push('a.qc_status IS NULL');
      } else {
        whereConditions.push('a.qc_status = ?');
        params.push(qc_status);
      }
    }

    if (qc_user) {
      whereConditions.push('a.assigned_to = ?');
      params.push(qc_user);
    }

    if (deliverable_type) {
      whereConditions.push('a.deliverable_type = ?');
      params.push(deliverable_type);
    }

    if (supervisor_review_requested === 'true') {
      whereConditions.push('a.supervisor_review_requested = 1');
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM assets a
      LEFT JOIN users uploader ON a.user_id = uploader.id
      LEFT JOIN users qc_user ON a.assigned_to = qc_user.id
      ${whereClause}
    `;

    const totalCount = await new Promise((resolve, reject) => {
      db.get(countQuery, params, (err, result) => {
        if (err) reject(err);
        else resolve(result.total);
      });
    });

    // Get assets with pagination
    const assetsQuery = `
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
        a.qc_completed_date,
        a.qc_notes as qc_comments,
        a.supervisor_review_requested,
        uploader.username,
        uploader.email as uploader_email,
        qc_user.username as qc_username,
        qc_user.email as qc_email,
        uploader.username as uploader_name
      FROM assets a
      LEFT JOIN users uploader ON a.user_id = uploader.id
      LEFT JOIN users qc_user ON a.assigned_to = qc_user.id
      ${whereClause}
      ORDER BY a.created_date DESC
      LIMIT ? OFFSET ?
    `;

    const finalParams = [...params, parseInt(limit), offset];

    const assets = await new Promise((resolve, reject) => {
      db.all(assetsQuery, finalParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      assets,
      totalCount,
      totalPages,
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

// Get filter options for dropdowns
const getFilterOptions = async (req, res) => {
  try {
    const [qcUsers, deliverableTypes] = await Promise.all([
      // Get QC users
      new Promise((resolve, reject) => {
        db.all(
          'SELECT id, username FROM users WHERE role = ? AND is_active = 1',
          ['qc_user'],
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      }),
      
      // Get deliverable types
      new Promise((resolve, reject) => {
        db.all(
          'SELECT DISTINCT deliverable_type FROM assets WHERE deliverable_type IS NOT NULL ORDER BY deliverable_type',
          (err, results) => {
            if (err) reject(err);
            else resolve(results.map(r => r.deliverable_type));
          }
        );
      })
    ]);

    res.json({
      qcUsers,
      deliverableTypes
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
};

// Get specific asset details for review
const getAssetDetails = async (req, res) => {
  try {
    const { assetId } = req.params;

    const asset = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          a.*,
          uploader.username as uploader_name,
          uploader.email as uploader_email,
          qc_user.username as qc_username,
          qc_user.email as qc_email
        FROM assets a
        LEFT JOIN users uploader ON a.user_id = uploader.id
        LEFT JOIN users qc_user ON a.assigned_to = qc_user.id
        WHERE a.asset_id = ?`,
        [assetId],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get associated files
    const files = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM uploads WHERE asset_id = ? ORDER BY upload_date',
        [assetId],
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    res.json({
      asset: {
        ...asset,
        metadata: asset.metadata ? JSON.parse(asset.metadata) : {}
      },
      files
    });

  } catch (error) {
    console.error('Error fetching asset details:', error);
    res.status(500).json({ error: 'Failed to fetch asset details' });
  }
};

// Update asset QC status (supervisor review)
const updateAssetStatus = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { status, supervisor_notes, updated_metadata } = req.body;
    const supervisorId = req.user.id;

    // Validate status (only approved or rejected)
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' });
    }

    // Update asset with metadata
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE assets 
         SET qc_status = ?, 
             qc_completed_date = CURRENT_TIMESTAMP,
             supervisor_reviewed_by = ?,
             supervisor_notes = ?,
             metadata = ?
         WHERE asset_id = ?`,
        [status, supervisorId, supervisor_notes, updated_metadata ? JSON.stringify(updated_metadata) : null, assetId],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) reject(new Error('Asset not found'));
          else resolve();
        }
      );
    });

    // Log supervisor action
    db.run(
      `INSERT INTO supervisor_actions 
       (supervisor_id, action_type, target_upload_id, description, action_data, performed_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        supervisorId,
        'asset_review',
        null, // We don't have upload_id directly linked
        `Reviewed asset ${assetId} - ${status}`,
        JSON.stringify({ status, supervisor_notes, updated_metadata })
      ]
    );

    res.json({ 
      message: 'Asset status updated successfully',
      status,
      assetId 
    });

  } catch (error) {
    console.error('Error updating asset status:', error);
    res.status(500).json({ error: 'Failed to update asset status' });
  }
};


module.exports = {
  getStatistics,
  getAssets,
  getFilterOptions,
  getAssetDetails,
  updateAssetStatus
};