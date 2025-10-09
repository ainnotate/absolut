const { db } = require('../models/database');

// Get auto-assign setting
const getAutoAssignSetting = async (req, res) => {
  try {
    db.get(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'auto_assign'`,
      [],
      (err, row) => {
        if (err) {
          console.error('Error fetching auto-assign setting:', err);
          return res.status(500).json({ error: 'Failed to fetch auto-assign setting' });
        }
        res.json({ autoAssign: row?.setting_value === 'true' });
      }
    );
  } catch (error) {
    console.error('Error getting auto-assign setting:', error);
    res.status(500).json({ error: 'Failed to get auto-assign setting' });
  }
};

// Update auto-assign setting
const updateAutoAssignSetting = async (req, res) => {
  try {
    const { autoAssign } = req.body;

    db.run(
      `UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'auto_assign'`,
      [autoAssign ? 'true' : 'false'],
      function(err) {
        if (err) {
          console.error('Error updating auto-assign setting:', err);
          return res.status(500).json({ error: 'Failed to update auto-assign setting' });
        }
        res.json({ success: true, autoAssign });
      }
    );
  } catch (error) {
    console.error('Error updating auto-assign setting:', error);
    res.status(500).json({ error: 'Failed to update auto-assign setting' });
  }
};

// Get all available locales from assets
const getLocales = async (req, res) => {
  try {
    db.all(
      `SELECT DISTINCT json_extract(metadata, '$.locale') as locale 
       FROM assets 
       WHERE metadata IS NOT NULL AND json_extract(metadata, '$.locale') IS NOT NULL
       ORDER BY locale`,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error fetching locales:', err);
          return res.status(500).json({ error: 'Failed to fetch locales' });
        }
        res.json({ locales: rows.map(r => r.locale).filter(Boolean) });
      }
    );
  } catch (error) {
    console.error('Error getting locales:', error);
    res.status(500).json({ error: 'Failed to get locales' });
  }
};

// Get booking categories for a specific locale
const getBookingCategoriesByLocale = async (req, res) => {
  try {
    const { locale } = req.params;

    db.all(
      `SELECT DISTINCT json_extract(metadata, '$.bookingCategory') as booking_category, COUNT(*) as count
       FROM assets 
       WHERE json_extract(metadata, '$.locale') = ? 
       AND json_extract(metadata, '$.bookingCategory') IS NOT NULL
       GROUP BY booking_category
       ORDER BY booking_category`,
      [locale],
      (err, rows) => {
        if (err) {
          console.error('Error fetching booking categories:', err);
          return res.status(500).json({ error: 'Failed to fetch booking categories' });
        }
        res.json({ bookingCategories: rows.filter(r => r.booking_category) });
      }
    );
  } catch (error) {
    console.error('Error getting booking categories:', error);
    res.status(500).json({ error: 'Failed to get booking categories' });
  }
};

// Get deliverable types for a specific locale and booking category
const getDeliverableTypesByCategory = async (req, res) => {
  try {
    const { locale, bookingCategory } = req.params;

    db.all(
      `SELECT DISTINCT deliverable_type, COUNT(*) as count
       FROM assets 
       WHERE json_extract(metadata, '$.locale') = ?
       AND json_extract(metadata, '$.bookingCategory') = ?
       GROUP BY deliverable_type
       ORDER BY deliverable_type`,
      [locale, bookingCategory],
      (err, rows) => {
        if (err) {
          console.error('Error fetching deliverable types:', err);
          return res.status(500).json({ error: 'Failed to fetch deliverable types' });
        }
        res.json({ deliverableTypes: rows });
      }
    );
  } catch (error) {
    console.error('Error getting deliverable types:', error);
    res.status(500).json({ error: 'Failed to get deliverable types' });
  }
};

// Get deliverable types for a specific locale (keeping for backward compatibility)
const getDeliverableTypesByLocale = async (req, res) => {
  try {
    const { locale } = req.params;

    db.all(
      `SELECT DISTINCT deliverable_type, COUNT(*) as count
       FROM assets 
       WHERE json_extract(metadata, '$.locale') = ?
       GROUP BY deliverable_type
       ORDER BY deliverable_type`,
      [locale],
      (err, rows) => {
        if (err) {
          console.error('Error fetching deliverable types:', err);
          return res.status(500).json({ error: 'Failed to fetch deliverable types' });
        }
        res.json({ deliverableTypes: rows });
      }
    );
  } catch (error) {
    console.error('Error getting deliverable types:', error);
    res.status(500).json({ error: 'Failed to get deliverable types' });
  }
};

// Get batches for a specific locale and booking category (no deliverable type)
const getBatchesByCategory = async (req, res) => {
  try {
    const { locale, bookingCategory } = req.params;

    // Get batch statistics
    const batchQuery = `
      SELECT 
        json_extract(metadata, '$.locale') as locale,
        json_extract(metadata, '$.bookingCategory') as booking_category,
        COUNT(*) as total_assets,
        COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned_count,
        COUNT(CASE WHEN qc_status = 'pending' OR qc_status IS NULL THEN 1 END) as pending_count,
        COUNT(CASE WHEN qc_status = 'approved' THEN 1 END) as completed_count,
        COUNT(CASE WHEN assigned_to IS NOT NULL AND (qc_status = 'pending' OR qc_status = 'in_progress') THEN 1 END) as in_progress_count
      FROM assets
      WHERE json_extract(metadata, '$.locale') = ? 
      AND json_extract(metadata, '$.bookingCategory') = ?
      GROUP BY locale, booking_category
    `;

    db.get(batchQuery, [locale, bookingCategory], (err, batch) => {
      if (err) {
        console.error('Error fetching batch:', err);
        return res.status(500).json({ error: 'Failed to fetch batch' });
      }

      if (!batch) {
        return res.json({ batch: null, assignedUsers: [] });
      }

      // Get assigned users for this batch
      const assignedUsersQuery = `
        SELECT ba.id, ba.user_id, u.username, u.email, ba.assigned_at, ba.assigned_assets, ba.completed_assets
        FROM batch_assignments ba
        INNER JOIN users u ON ba.user_id = u.id
        WHERE ba.locale = ? AND ba.booking_category = ? AND ba.active = 1
        ORDER BY u.username
      `;

      db.all(assignedUsersQuery, [locale, bookingCategory], (err, users) => {
        if (err) {
          console.error('Error fetching assigned users:', err);
          return res.status(500).json({ error: 'Failed to fetch assigned users' });
        }

        // Get unassigned asset IDs for this batch
        const unassignedAssetsQuery = `
          SELECT id FROM assets 
          WHERE json_extract(metadata, '$.locale') = ? 
          AND json_extract(metadata, '$.bookingCategory') = ?
          AND assigned_to IS NULL
        `;

        db.all(unassignedAssetsQuery, [locale, bookingCategory], (err, assets) => {
          if (err) {
            console.error('Error fetching unassigned assets:', err);
            return res.status(500).json({ error: 'Failed to fetch unassigned assets' });
          }

          res.json({
            batch: {
              ...batch,
              batch_id: `${locale}_${bookingCategory}`.replace(/\s+/g, '_')
            },
            assignedUsers: users || [],
            unassignedAssetIds: assets.map(asset => asset.id)
          });
        });
      });
    });
  } catch (error) {
    console.error('Error getting batch:', error);
    res.status(500).json({ error: 'Failed to get batch' });
  }
};

// Get batches for a specific locale and deliverable type (keeping for backward compatibility)
const getBatchesByType = async (req, res) => {
  try {
    const { locale, deliverableType } = req.params;

    // Get batch statistics
    const batchQuery = `
      SELECT 
        json_extract(metadata, '$.locale') as locale,
        deliverable_type,
        COUNT(*) as total_assets,
        COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned_count,
        COUNT(CASE WHEN qc_status = 'pending' OR qc_status IS NULL THEN 1 END) as pending_count,
        COUNT(CASE WHEN qc_status = 'approved' THEN 1 END) as completed_count,
        COUNT(CASE WHEN assigned_to IS NOT NULL AND (qc_status = 'pending' OR qc_status = 'in_progress') THEN 1 END) as in_progress_count
      FROM assets
      WHERE json_extract(metadata, '$.locale') = ? AND deliverable_type = ?
      GROUP BY locale, deliverable_type
    `;

    db.get(batchQuery, [locale, deliverableType], (err, batch) => {
      if (err) {
        console.error('Error fetching batch:', err);
        return res.status(500).json({ error: 'Failed to fetch batch' });
      }

      if (!batch) {
        return res.json({ batch: null, assignedUsers: [] });
      }

      // Get assigned users for this batch
      const assignedUsersQuery = `
        SELECT ba.id, ba.user_id, u.username, u.email, ba.assigned_at, ba.assigned_assets, ba.completed_assets
        FROM batch_assignments ba
        INNER JOIN users u ON ba.user_id = u.id
        WHERE ba.locale = ? AND ba.deliverable_type = ? AND ba.active = 1
        ORDER BY u.username
      `;

      db.all(assignedUsersQuery, [locale, deliverableType], (err, users) => {
        if (err) {
          console.error('Error fetching assigned users:', err);
          return res.status(500).json({ error: 'Failed to fetch assigned users' });
        }

        res.json({
          batch: {
            ...batch,
            batch_id: `${locale}_${deliverableType}`.replace(/\s+/g, '_')
          },
          assignedUsers: users || []
        });
      });
    });
  } catch (error) {
    console.error('Error getting batch:', error);
    res.status(500).json({ error: 'Failed to get batch' });
  }
};

// Get unassigned QC users for a batch
const getUnassignedUsers = async (req, res) => {
  try {
    const { locale, bookingCategory } = req.query;

    // Simplified two-level hierarchy: locale -> booking category
    const query = `
      SELECT u.id, u.username, u.email
      FROM users u
      WHERE u.role = 'qc_user' AND u.is_active = 1
      AND u.id NOT IN (
        SELECT user_id FROM batch_assignments
        WHERE locale = ? AND booking_category = ? AND active = 1
      )
      ORDER BY u.username
    `;

    db.all(query, [locale, bookingCategory], (err, users) => {
      if (err) {
        console.error('Error fetching unassigned users:', err);
        return res.status(500).json({ error: 'Failed to fetch unassigned users' });
      }
      res.json({ users });
    });
  } catch (error) {
    console.error('Error getting unassigned users:', error);
    res.status(500).json({ error: 'Failed to get unassigned users' });
  }
};

// Assign user to a batch
const assignUserToBatch = async (req, res) => {
  try {
    const { locale, bookingCategory, userId, assetIds } = req.body;
    const assignedBy = req.user.id;
    const batchId = `${locale}_${bookingCategory}`.replace(/\s+/g, '_');
    

    // Start transaction
    db.serialize(() => {
      // Create or update batch assignment
      const insertQuery = `INSERT OR REPLACE INTO batch_assignments 
         (batch_id, locale, booking_category, user_id, assigned_assets, active, assigned_by)
         VALUES (?, ?, ?, ?, ?, 1, ?)`;
         
      const insertParams = [batchId, locale, bookingCategory, userId, assetIds ? assetIds.length : 0, assignedBy];

      db.run(insertQuery, insertParams,
        function(err) {
          if (err) {
            console.error('Error creating batch assignment:', err);
            return res.status(500).json({ error: 'Failed to create batch assignment' });
          }

          // If specific assets are provided, assign them
          if (assetIds && assetIds.length > 0) {
            const placeholders = assetIds.map(() => '?').join(',');
            db.run(
              `UPDATE assets 
               SET assigned_to = ?, batch_id = ?, qc_status = 'pending'
               WHERE id IN (${placeholders})`,
              [userId, batchId, ...assetIds],
              function(err) {
                if (err) {
                  console.error('Error assigning assets:', err);
                  return res.status(500).json({ error: 'Failed to assign assets' });
                }
                res.json({ 
                  success: true, 
                  assignedCount: this.changes,
                  batchAssignmentId: this.lastID 
                });
              }
            );
          } else {
            // Auto-assign unassigned assets from this batch
            const updateQuery = `UPDATE assets 
               SET assigned_to = ?, batch_id = ?, qc_status = 'pending'
               WHERE json_extract(metadata, '$.locale') = ? 
               AND json_extract(metadata, '$.bookingCategory') = ?
               AND assigned_to IS NULL
               LIMIT 50`; // Assign up to 50 assets at a time
                 
            const updateParams = [userId, batchId, locale, bookingCategory];

            db.run(updateQuery, updateParams,
              function(err) {
                if (err) {
                  console.error('Error auto-assigning assets:', err);
                  return res.status(500).json({ error: 'Failed to auto-assign assets' });
                }
                
                // Update assigned count in batch_assignments
                db.run(
                  `UPDATE batch_assignments 
                   SET assigned_assets = assigned_assets + ?
                   WHERE batch_id = ? AND user_id = ?`,
                  [this.changes, batchId, userId],
                  (err) => {
                    if (err) console.error('Error updating assigned count:', err);
                  }
                );

                res.json({ 
                  success: true, 
                  assignedCount: this.changes
                });
              }
            );
          }
        }
      );
    });
  } catch (error) {
    console.error('Error assigning user to batch:', error);
    res.status(500).json({ error: 'Failed to assign user to batch' });
  }
};

// Remove user from a batch
const removeUserFromBatch = async (req, res) => {
  try {
    const { locale, bookingCategory, userId } = req.body;
    const batchId = `${locale}_${bookingCategory}`.replace(/\s+/g, '_');

    db.serialize(() => {
      // Mark batch assignment as inactive
      const updateQuery = `UPDATE batch_assignments SET active = 0
         WHERE locale = ? AND booking_category = ? AND user_id = ?`;
         
      const updateParams = [locale, bookingCategory, userId];

      db.run(updateQuery, updateParams,
        function(err) {
          if (err) {
            console.error('Error removing user from batch:', err);
            return res.status(500).json({ error: 'Failed to remove user from batch' });
          }

          // Unassign assets from this user in this batch
          db.run(
            `UPDATE assets 
             SET assigned_to = NULL, batch_id = NULL
             WHERE assigned_to = ? AND batch_id = ?`,
            [userId, batchId],
            function(err) {
              if (err) {
                console.error('Error unassigning assets:', err);
                return res.status(500).json({ error: 'Failed to unassign assets' });
              }
              res.json({ 
                success: true,
                unassignedCount: this.changes
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Error removing user from batch:', error);
    res.status(500).json({ error: 'Failed to remove user from batch' });
  }
};

// Get user's assigned batches
const getUserBatches = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT
        ba.batch_id,
        ba.locale,
        ba.deliverable_type,
        ba.assigned_assets,
        ba.completed_assets,
        COUNT(DISTINCT a.id) as total_assets,
        COUNT(CASE WHEN a.qc_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN a.qc_status = 'approved' THEN 1 END) as completed_count
      FROM batch_assignments ba
      LEFT JOIN assets a ON a.batch_id = ba.batch_id AND a.assigned_to = ba.user_id
      WHERE ba.user_id = ? AND ba.active = 1
      GROUP BY ba.batch_id, ba.locale, ba.deliverable_type
      ORDER BY ba.assigned_at DESC
    `;

    db.all(query, [userId], (err, batches) => {
      if (err) {
        console.error('Error fetching user batches:', err);
        return res.status(500).json({ error: 'Failed to fetch user batches' });
      }
      res.json({ batches });
    });
  } catch (error) {
    console.error('Error getting user batches:', error);
    res.status(500).json({ error: 'Failed to get user batches' });
  }
};

// Get all batches summary for admin
const getAllBatches = async (req, res) => {
  try {
    const query = `
      SELECT 
        json_extract(metadata, '$.locale') as locale,
        deliverable_type,
        COUNT(*) as total_assets,
        COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned_count,
        COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_count,
        COUNT(CASE WHEN qc_status = 'approved' THEN 1 END) as completed_count,
        COUNT(CASE WHEN supervisor_status = 'approved' THEN 1 END) as supervisor_approved
      FROM assets
      WHERE metadata IS NOT NULL
      GROUP BY locale, deliverable_type
      HAVING locale IS NOT NULL
      ORDER BY locale, deliverable_type
    `;

    db.all(query, [], (err, batches) => {
      if (err) {
        console.error('Error fetching all batches:', err);
        return res.status(500).json({ error: 'Failed to fetch batches' });
      }

      // Add batch_id to each batch
      const batchesWithId = batches.map(batch => ({
        ...batch,
        batch_id: `${batch.locale}_${batch.deliverable_type}`.replace(/\s+/g, '_')
      }));

      res.json({ batches: batchesWithId });
    });
  } catch (error) {
    console.error('Error getting all batches:', error);
    res.status(500).json({ error: 'Failed to get all batches' });
  }
};

module.exports = {
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
};