const bcrypt = require('bcrypt');
const { db } = require('../models/database');

const getAllUsers = async (req, res) => {
  try {
    db.all(
      `SELECT id, username, email, role, first_name, last_name, profile_picture, 
              is_active, last_login, created_at, updated_at,
              CASE WHEN google_id IS NOT NULL THEN 1 ELSE 0 END as is_google_user
       FROM users 
       ORDER BY created_at DESC`,
      [],
      (err, users) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`✅ Retrieved ${users.length} users for admin`);
        res.json({ users });
      }
    );
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createUser = async (req, res) => {
  const { username, email, password, role, first_name, last_name } = req.body;
  
  if (!username || !email || !role) {
    return res.status(400).json({ error: 'Username, email, and role are required' });
  }

  if (!['admin', 'qc_user', 'upload_user', 'supervisor'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    db.run(
      `INSERT INTO users (username, email, password, role, first_name, last_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, role, first_name || null, last_name || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        console.log(`✅ Admin created user: ${username} (${role})`);
        res.status(201).json({
          message: 'User created successfully',
          user: {
            id: this.lastID,
            username,
            email,
            role,
            first_name,
            last_name
          }
        });
      }
    );
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, role, first_name, last_name, is_active } = req.body;

  if (!['admin', 'qc_user', 'upload_user', 'supervisor'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    db.run(
      `UPDATE users 
       SET username = ?, email = ?, role = ?, first_name = ?, last_name = ?, 
           is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [username, email, role, first_name || null, last_name || null, is_active ? 1 : 0, id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        console.log(`✅ Admin updated user ID ${id}: ${username} (${role})`);
        res.json({ message: 'User updated successfully' });
      }
    );
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  // Prevent deleting the current user
  if (req.user.id === parseInt(id)) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    db.run(
      'DELETE FROM users WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        console.log(`✅ Admin deleted user ID ${id}`);
        res.json({ message: 'User deleted successfully' });
      }
    );
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetUserPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        console.log(`✅ Admin reset password for user ID ${id}`);
        res.json({ message: 'Password reset successfully' });
      }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserStats = async (req, res) => {
  try {
    db.all(
      `SELECT 
         role,
         COUNT(*) as count,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
         SUM(CASE WHEN google_id IS NOT NULL THEN 1 ELSE 0 END) as google_users
       FROM users 
       GROUP BY role
       ORDER BY count DESC`,
      [],
      (err, stats) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Get total counts
        db.get(
          `SELECT 
             COUNT(*) as total_users,
             SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
             SUM(CASE WHEN last_login > datetime('now', '-7 days') THEN 1 ELSE 0 END) as recent_logins
           FROM users`,
          [],
          (err, totals) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }

            res.json({
              roleStats: stats,
              totalStats: totals
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getUserStats
};