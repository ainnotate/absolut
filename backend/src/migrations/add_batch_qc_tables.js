const { db } = require('../models/database');

const runMigration = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Adding batch assignment and QC tables...');

      // Create batch_assignments table
      db.run(`
        CREATE TABLE IF NOT EXISTS batch_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_id TEXT NOT NULL,
          locale TEXT NOT NULL,
          deliverable_type TEXT NOT NULL,
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
        if (err) console.error('Error creating batch_assignments:', err);
        else console.log('✅ batch_assignments table created');
      });

      // Add QC-related columns to assets table
      db.run(`ALTER TABLE assets ADD COLUMN assigned_to INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding assigned_to:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN batch_id TEXT`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding batch_id:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN qc_status TEXT DEFAULT 'pending'`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding qc_status:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN qc_completed_by INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding qc_completed_by:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN qc_completed_date DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding qc_completed_date:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN qc_notes TEXT`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding qc_notes:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN supervisor_status TEXT DEFAULT 'pending'`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding supervisor_status:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN supervisor_reviewed_by INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding supervisor_reviewed_by:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN supervisor_reviewed_date DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding supervisor_reviewed_date:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN supervisor_notes TEXT`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding supervisor_notes:', err);
      });

      db.run(`ALTER TABLE assets ADD COLUMN send_to_supervisor BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate')) console.error('Error adding send_to_supervisor:', err);
      });

      // Create qc_submissions table for tracking QC actions
      db.run(`
        CREATE TABLE IF NOT EXISTS qc_submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          asset_id TEXT NOT NULL,
          qc_user_id INTEGER NOT NULL,
          action TEXT CHECK(action IN ('approved', 'rejected')) NOT NULL,
          reject_reason TEXT,
          metadata_before TEXT,
          metadata_after TEXT,
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
          FOREIGN KEY (qc_user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) console.error('Error creating qc_submissions:', err);
        else console.log('✅ qc_submissions table created');
      });

      // Create supervisor_reviews table
      db.run(`
        CREATE TABLE IF NOT EXISTS supervisor_reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          asset_id TEXT NOT NULL,
          supervisor_id INTEGER NOT NULL,
          action TEXT CHECK(action IN ('approved', 'rejected', 'consulted')) NOT NULL,
          notes TEXT,
          reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
          FOREIGN KEY (supervisor_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) console.error('Error creating supervisor_reviews:', err);
        else console.log('✅ supervisor_reviews table created');
      });

      // Create system_settings table for auto-assign and other settings
      db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT UNIQUE NOT NULL,
          setting_value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating system_settings:', err);
        else {
          console.log('✅ system_settings table created');
          // Insert default auto-assign setting
          db.run(
            `INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES ('auto_assign', 'false')`,
            (err) => {
              if (err) console.error('Error inserting auto-assign setting:', err);
              else console.log('✅ Default auto-assign setting added');
              resolve();
            }
          );
        }
      });
    });
  });
};

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };