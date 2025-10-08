const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'absolute.db');
const db = new sqlite3.Database(dbPath);

const simpleMigration = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting simple migration...');

    // Step 1: Add asset_id column to uploads table
    db.run('ALTER TABLE uploads ADD COLUMN asset_id TEXT', (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding asset_id column:', err);
        return reject(err);
      }
      console.log('Added asset_id column to uploads table');

      // Step 2: Get all existing uploads
      db.all('SELECT * FROM uploads WHERE asset_id IS NULL', [], (err, uploads) => {
        if (err) {
          console.error('Error fetching uploads:', err);
          return reject(err);
        }

        console.log(`Found ${uploads.length} uploads to process`);

        if (uploads.length === 0) {
          console.log('No uploads to migrate');
          return resolve();
        }

        let processedUploads = 0;

        uploads.forEach((upload) => {
          // Create asset for each upload (simple 1:1 mapping for now)
          const timestamp = new Date(upload.upload_date).getTime();
          const assetId = `AST_${upload.user_id}_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

          // Determine deliverable type from category or file_type
          let deliverableType = 'Raw Email';
          if (upload.category === '.eml + pdf') {
            deliverableType = 'Email + Attachment';
          } else if (upload.file_type === 'txt') {
            deliverableType = 'Text Message';
          }

          // Create asset
          db.run(`
            INSERT INTO assets (asset_id, user_id, deliverable_type, metadata, created_date)
            VALUES (?, ?, ?, ?, ?)
          `, [assetId, upload.user_id, deliverableType, upload.metadata, upload.upload_date], (err) => {
            if (err) {
              console.error(`Error creating asset for upload ${upload.id}:`, err);
              return reject(err);
            }

            // Update upload with asset_id
            db.run('UPDATE uploads SET asset_id = ? WHERE id = ?', [assetId, upload.id], (err) => {
              if (err) {
                console.error(`Error updating upload ${upload.id}:`, err);
                return reject(err);
              }

              console.log(`Processed upload ${upload.id} -> asset ${assetId}`);
              processedUploads++;

              if (processedUploads === uploads.length) {
                console.log('✅ Simple migration completed successfully!');
                resolve();
              }
            });
          });
        });
      });
    });
  });
};

// Run migration
simpleMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });