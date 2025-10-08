const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'absolute.db');
const db = new sqlite3.Database(dbPath);

// Migration script to convert existing uploads to asset-based structure
const migrateToAssets = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Starting migration to asset-based structure...');

      // First, get all existing uploads grouped by user sessions (based on similar timestamps)
      db.all(`
        SELECT 
          id,
          user_id,
          filename,
          file_type,
          category,
          s3_key,
          md5_hash,
          metadata,
          upload_date
        FROM uploads 
        ORDER BY user_id, upload_date
      `, [], (err, uploads) => {
        if (err) {
          console.error('Error fetching uploads:', err);
          return reject(err);
        }

        console.log(`Found ${uploads.length} existing uploads to migrate`);

        // Group uploads into assets based on category/file type
        const assetGroups = [];
        let currentGroup = null;

        uploads.forEach((upload, index) => {
          const deliverableType = upload.category || upload.file_type;
          
          // Determine if this should be a new asset or part of the current one
          const shouldCreateNewAsset = !currentGroup || 
            currentGroup.user_id !== upload.user_id || 
            (deliverableType === '.eml' && currentGroup.deliverable_type !== '.eml + pdf') ||
            (deliverableType === '.txt' && true) || // text files are always separate assets
            (Math.abs(new Date(upload.upload_date) - new Date(currentGroup.upload_date)) > 5 * 60 * 1000); // 5 minutes apart

          if (shouldCreateNewAsset) {
            currentGroup = {
              user_id: upload.user_id,
              deliverable_type: deliverableType,
              upload_date: upload.upload_date,
              metadata: upload.metadata,
              uploads: [upload]
            };
            assetGroups.push(currentGroup);
          } else {
            // Add to current group and update deliverable type if needed
            currentGroup.uploads.push(upload);
            if (deliverableType === '.eml + pdf' || 
                (currentGroup.deliverable_type === '.eml' && upload.file_type === 'pdf')) {
              currentGroup.deliverable_type = '.eml + pdf';
            }
          }
        });

        console.log(`Created ${assetGroups.length} asset groups`);

        // Now create assets and update uploads
        let processedGroups = 0;

        assetGroups.forEach((group, groupIndex) => {
          // Generate asset ID
          const timestamp = new Date(group.upload_date).getTime();
          const assetId = `AST_${group.user_id}_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

          // Map deliverable types
          let deliverableType = 'Raw Email';
          if (group.deliverable_type === '.eml + pdf' || group.deliverable_type === 'Email + Attachment') {
            deliverableType = 'Email + Attachment';
          } else if (group.deliverable_type === '.txt') {
            deliverableType = 'Text Message';
          }

          // Insert asset
          db.run(`
            INSERT INTO assets (asset_id, user_id, deliverable_type, metadata, created_date)
            VALUES (?, ?, ?, ?, ?)
          `, [assetId, group.user_id, deliverableType, group.metadata, group.upload_date], function(err) {
            if (err) {
              console.error(`Error creating asset ${assetId}:`, err);
              return reject(err);
            }

            console.log(`Created asset ${assetId} with ${group.uploads.length} files`);

            // Now we need to recreate the uploads table with the new schema
            // But first, let's create a backup and then update
            processedGroups++;
            if (processedGroups === assetGroups.length) {
              // All assets created, now update the uploads table schema
              updateUploadsSchema(assetGroups, resolve, reject);
            }
          });
        });
      });
    });
  });
};

const updateUploadsSchema = (assetGroups, resolve, reject) => {
  console.log('Updating uploads table schema...');

  db.serialize(() => {
    // Create new uploads table with correct schema
    db.run(`
      CREATE TABLE IF NOT EXISTS uploads_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        s3_key TEXT NOT NULL,
        md5_hash TEXT NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
        UNIQUE(user_id, md5_hash)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating new uploads table:', err);
        return reject(err);
      }

      // Insert data into new table
      let totalUploads = 0;
      assetGroups.forEach(group => totalUploads += group.uploads.length);
      let processedUploads = 0;

      assetGroups.forEach((group) => {
        const timestamp = new Date(group.upload_date).getTime();
        const assetId = `AST_${group.user_id}_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

        // Get the actual asset_id from database
        db.get('SELECT asset_id FROM assets WHERE user_id = ? AND created_date = ?', 
          [group.user_id, group.upload_date], (err, asset) => {
          if (err) {
            console.error('Error finding asset:', err);
            return reject(err);
          }

          const actualAssetId = asset ? asset.asset_id : assetId;

          group.uploads.forEach((upload) => {
            db.run(`
              INSERT INTO uploads_new (asset_id, user_id, filename, file_type, s3_key, md5_hash, upload_date)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [actualAssetId, upload.user_id, upload.filename, upload.file_type, upload.s3_key, upload.md5_hash, upload.upload_date], (err) => {
              if (err) {
                console.error('Error inserting upload:', err);
                return reject(err);
              }

              processedUploads++;
              if (processedUploads === totalUploads) {
                // All uploads migrated, replace old table
                finalizeMigration(resolve, reject);
              }
            });
          });
        });
      });
    });
  });
};

const finalizeMigration = (resolve, reject) => {
  console.log('Finalizing migration...');

  db.serialize(() => {
    // Drop old table and rename new one
    db.run('DROP TABLE uploads', (err) => {
      if (err) {
        console.error('Error dropping old uploads table:', err);
        return reject(err);
      }

      db.run('ALTER TABLE uploads_new RENAME TO uploads', (err) => {
        if (err) {
          console.error('Error renaming new uploads table:', err);
          return reject(err);
        }

        console.log('✅ Migration completed successfully!');
        resolve();
      });
    });
  });
};

// Run migration
migrateToAssets()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });