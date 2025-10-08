const { db } = require('../models/database');

const runMigration = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Updating batch_assignments schema for 2-level hierarchy...');

      // Add booking_category column
      db.run(`ALTER TABLE batch_assignments ADD COLUMN booking_category TEXT`, (err) => {
        if (err && !err.message.includes('duplicate')) {
          console.error('Error adding booking_category:', err);
        } else {
          console.log('✅ booking_category column added to batch_assignments');
        }
      });

      // Since SQLite doesn't support dropping NOT NULL constraints directly,
      // we need to recreate the table
      db.run(`
        CREATE TABLE IF NOT EXISTS batch_assignments_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_id TEXT NOT NULL,
          locale TEXT NOT NULL,
          deliverable_type TEXT,  -- Made nullable
          booking_category TEXT,  -- New column for 2-level hierarchy
          user_id INTEGER NOT NULL,
          total_assets INTEGER DEFAULT 0,
          assigned_assets INTEGER DEFAULT 0,
          completed_assets INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT 1,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          assigned_by INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (assigned_by) REFERENCES users(id),
          UNIQUE(batch_id, user_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating new batch_assignments table:', err);
          reject(err);
          return;
        }
        console.log('✅ New batch_assignments table created');

        // Copy existing data
        db.run(`
          INSERT INTO batch_assignments_new 
          SELECT id, batch_id, locale, deliverable_type, NULL as booking_category, 
                 user_id, total_assets, assigned_assets, completed_assets, 
                 active, assigned_at, assigned_by
          FROM batch_assignments
        `, (err) => {
          if (err) {
            console.error('Error copying data:', err);
          } else {
            console.log('✅ Data copied to new table');
          }

          // Drop old table and rename new one
          db.run(`DROP TABLE batch_assignments`, (err) => {
            if (err) {
              console.error('Error dropping old table:', err);
            } else {
              console.log('✅ Old table dropped');
            }

            db.run(`ALTER TABLE batch_assignments_new RENAME TO batch_assignments`, (err) => {
              if (err) {
                console.error('Error renaming table:', err);
                reject(err);
              } else {
                console.log('✅ Table renamed successfully');
                resolve();
              }
            });
          });
        });
      });
    });
  });
};

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Schema update completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Schema update failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };