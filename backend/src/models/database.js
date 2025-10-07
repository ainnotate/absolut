const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../absolute.db');
const db = new sqlite3.Database(dbPath);

db.configure('busyTimeout', 5000);
db.run('PRAGMA journal_mode = WAL');

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          google_id TEXT UNIQUE,
          role TEXT CHECK(role IN ('admin', 'qc_user', 'upload_user', 'supervisor')) NOT NULL,
          first_name TEXT,
          last_name TEXT,
          profile_picture TEXT,
          is_active BOOLEAN DEFAULT 1,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        } else {
          console.log('Users table created/verified');
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS user_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          permission_name TEXT NOT NULL,
          granted_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (granted_by) REFERENCES users(id),
          UNIQUE(user_id, permission_name)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating user_permissions table:', err);
          reject(err);
        } else {
          console.log('User permissions table created/verified');
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT NOT NULL,
          permission TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(role, permission)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating role_permissions table:', err);
          reject(err);
        } else {
          console.log('Role permissions table created/verified');
          setupDefaultRolePermissions();
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS upload_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          filename TEXT NOT NULL,
          file_size INTEGER,
          file_type TEXT,
          status TEXT DEFAULT 'pending',
          error_message TEXT,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating upload_logs table:', err);
          reject(err);
        } else {
          console.log('Upload logs table created/verified');
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS uploads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          filename TEXT NOT NULL,
          file_type TEXT NOT NULL,
          category TEXT NOT NULL,
          s3_key TEXT NOT NULL,
          md5_hash TEXT NOT NULL,
          metadata TEXT,
          upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, md5_hash)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating uploads table:', err);
          reject(err);
        } else {
          console.log('Uploads table created/verified');
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS qc_reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          upload_id INTEGER NOT NULL,
          reviewer_id INTEGER NOT NULL,
          status TEXT CHECK(status IN ('approved', 'rejected', 'needs_revision')) NOT NULL,
          comments TEXT,
          reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (upload_id) REFERENCES upload_logs(id),
          FOREIGN KEY (reviewer_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating qc_reviews table:', err);
          reject(err);
        } else {
          console.log('QC reviews table created/verified');
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS supervisor_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supervisor_id INTEGER NOT NULL,
          action_type TEXT NOT NULL,
          target_user_id INTEGER,
          target_upload_id INTEGER,
          description TEXT,
          action_data TEXT,
          performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (supervisor_id) REFERENCES users(id),
          FOREIGN KEY (target_user_id) REFERENCES users(id),
          FOREIGN KEY (target_upload_id) REFERENCES upload_logs(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating supervisor_actions table:', err);
          reject(err);
        } else {
          console.log('Supervisor actions table created/verified');
          resolve();
        }
      });
    });
  });
};

const setupDefaultRolePermissions = () => {
  const defaultPermissions = [
    // Admin permissions
    { role: 'admin', permission: 'manage_users', description: 'Create, update, delete users' },
    { role: 'admin', permission: 'view_all_data', description: 'View all platform data' },
    { role: 'admin', permission: 'system_settings', description: 'Modify system settings' },
    { role: 'admin', permission: 'export_data', description: 'Export platform data' },
    { role: 'admin', permission: 'view_analytics', description: 'View platform analytics' },
    
    // Supervisor permissions
    { role: 'supervisor', permission: 'view_all_uploads', description: 'View all user uploads' },
    { role: 'supervisor', permission: 'override_qc', description: 'Override QC decisions' },
    { role: 'supervisor', permission: 'assign_tasks', description: 'Assign tasks to users' },
    { role: 'supervisor', permission: 'view_user_performance', description: 'View user performance metrics' },
    { role: 'supervisor', permission: 'export_reports', description: 'Export performance reports' },
    
    // QC User permissions
    { role: 'qc_user', permission: 'review_uploads', description: 'Review and approve/reject uploads' },
    { role: 'qc_user', permission: 'add_comments', description: 'Add comments to uploads' },
    { role: 'qc_user', permission: 'view_assigned_uploads', description: 'View assigned uploads' },
    { role: 'qc_user', permission: 'update_review_status', description: 'Update review status' },
    
    // Upload User permissions
    { role: 'upload_user', permission: 'upload_files', description: 'Upload new files' },
    { role: 'upload_user', permission: 'view_own_uploads', description: 'View own upload history' },
    { role: 'upload_user', permission: 'edit_own_uploads', description: 'Edit own uploads before QC' },
    { role: 'upload_user', permission: 'view_upload_status', description: 'View upload review status' }
  ];

  defaultPermissions.forEach(perm => {
    db.run(
      'INSERT OR IGNORE INTO role_permissions (role, permission, description) VALUES (?, ?, ?)',
      [perm.role, perm.permission, perm.description],
      (err) => {
        if (err) console.error(`Error inserting permission ${perm.permission}:`, err);
      }
    );
  });
};

module.exports = { db, initializeDatabase };