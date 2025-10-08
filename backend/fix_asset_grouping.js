const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'absolute.db');
const db = new sqlite3.Database(dbPath);

const fixAssetGrouping = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting asset grouping fix...');

    // First, find uploads that should be grouped together (same timestamp and category)
    db.all(`
      SELECT user_id, upload_date, category, COUNT(*) as file_count
      FROM uploads 
      WHERE category = '.eml + pdf'
      GROUP BY user_id, upload_date, category
      HAVING COUNT(*) > 1
    `, [], (err, groups) => {
      if (err) {
        console.error('Error finding groups:', err);
        return reject(err);
      }

      console.log(`Found ${groups.length} groups that need to be merged`);

      if (groups.length === 0) {
        console.log('No groups need merging');
        return resolve();
      }

      let processedGroups = 0;

      groups.forEach((group) => {
        // Get all uploads in this group
        db.all(`
          SELECT id, asset_id, filename, file_type
          FROM uploads 
          WHERE user_id = ? AND upload_date = ? AND category = '.eml + pdf'
          ORDER BY file_type
        `, [group.user_id, group.upload_date], (err, uploads) => {
          if (err) {
            console.error('Error getting uploads for group:', err);
            return reject(err);
          }

          console.log(`Processing group with ${uploads.length} files:`, uploads.map(u => u.filename));

          // Keep the first asset_id and update all uploads to use it
          const primaryAssetId = uploads[0].asset_id;
          const secondaryAssetIds = uploads.slice(1).map(u => u.asset_id);

          console.log(`Primary asset ID: ${primaryAssetId}`);
          console.log(`Secondary asset IDs to merge: ${secondaryAssetIds.join(', ')}`);

          // Update all uploads to use the primary asset_id
          let updatedUploads = 0;
          uploads.forEach((upload, index) => {
            if (index === 0) {
              // Skip the first one since it already has the correct asset_id
              updatedUploads++;
              if (updatedUploads === uploads.length) {
                // All uploads processed, now clean up secondary assets
                cleanupSecondaryAssets(secondaryAssetIds, primaryAssetId, () => {
                  processedGroups++;
                  if (processedGroups === groups.length) {
                    console.log('✅ Asset grouping fix completed!');
                    resolve();
                  }
                });
              }
              return;
            }

            db.run('UPDATE uploads SET asset_id = ? WHERE id = ?', 
              [primaryAssetId, upload.id], (err) => {
              if (err) {
                console.error(`Error updating upload ${upload.id}:`, err);
                return reject(err);
              }

              console.log(`Updated upload ${upload.id} to use asset ${primaryAssetId}`);
              updatedUploads++;

              if (updatedUploads === uploads.length) {
                // All uploads processed, now clean up secondary assets
                cleanupSecondaryAssets(secondaryAssetIds, primaryAssetId, () => {
                  processedGroups++;
                  if (processedGroups === groups.length) {
                    console.log('✅ Asset grouping fix completed!');
                    resolve();
                  }
                });
              }
            });
          });
        });
      });
    });
  });
};

const cleanupSecondaryAssets = (secondaryAssetIds, primaryAssetId, callback) => {
  if (secondaryAssetIds.length === 0) {
    return callback();
  }

  console.log(`Cleaning up ${secondaryAssetIds.length} secondary assets`);

  // Update the primary asset to have the correct deliverable type
  db.run(`UPDATE assets SET deliverable_type = 'Email + Attachment' WHERE asset_id = ?`, 
    [primaryAssetId], (err) => {
    if (err) {
      console.error('Error updating primary asset deliverable type:', err);
    } else {
      console.log(`Updated primary asset ${primaryAssetId} to 'Email + Attachment'`);
    }

    // Delete secondary assets
    const placeholders = secondaryAssetIds.map(() => '?').join(',');
    db.run(`DELETE FROM assets WHERE asset_id IN (${placeholders})`, 
      secondaryAssetIds, (err) => {
      if (err) {
        console.error('Error deleting secondary assets:', err);
      } else {
        console.log(`Deleted ${secondaryAssetIds.length} secondary assets`);
      }
      callback();
    });
  });
};

// Run the fix
fixAssetGrouping()
  .then(() => {
    console.log('Asset grouping fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Asset grouping fix failed:', error);
    process.exit(1);
  });