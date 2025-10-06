const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { db } = require('../models/database');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const login = async (req, res) => {
  const { username, password } = req.body;
  console.log('🔐 Login attempt:', username);

  if (!username || !password) {
    console.log('❌ Missing credentials');
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get(
    'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
    [username, username],
    async (err, user) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        console.log('❌ User not found:', username);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.password) {
        console.log('❌ User registered with Google, no password set');
        return res.status(401).json({ error: 'Please login with Google' });
      }

      console.log('👤 User found:', user.username, 'Role:', user.role);
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        console.log('❌ Invalid password for user:', username);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      console.log('✅ Login successful for:', user.username, 'Role:', user.role);
      const token = generateToken(user);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_picture: user.profile_picture
        }
      });
    }
  );
};

const googleLogin = async (req, res) => {
  const { credential } = req.body;
  
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, given_name, family_name, picture } = payload;
    
    console.log('🔐 Google login attempt:', email);
    
    db.get(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleId, email],
      async (err, user) => {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (user) {
          if (!user.google_id) {
            db.run(
              'UPDATE users SET google_id = ?, profile_picture = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?',
              [googleId, picture, user.id]
            );
          } else {
            db.run(
              'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
              [user.id]
            );
          }
          
          console.log('✅ Google login successful for:', user.username);
          const token = generateToken(user);
          
          res.json({
            token,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              first_name: user.first_name,
              last_name: user.last_name,
              profile_picture: user.profile_picture
            }
          });
        } else {
          const username = email.split('@')[0];
          const defaultRole = 'upload_user';
          
          db.run(
            `INSERT INTO users (username, email, google_id, role, first_name, last_name, profile_picture, last_login) 
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [username, email, googleId, defaultRole, given_name, family_name, picture],
            function(err) {
              if (err) {
                if (err.message.includes('UNIQUE')) {
                  return res.status(400).json({ error: 'User already exists' });
                }
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              
              const newUser = {
                id: this.lastID,
                username,
                email,
                role: defaultRole,
                first_name: given_name,
                last_name: family_name,
                profile_picture: picture
              };
              
              console.log('✅ New user created via Google:', username);
              const token = generateToken(newUser);
              
              res.status(201).json({
                token,
                user: newUser,
                message: 'Account created successfully'
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('❌ Google authentication error:', error);
    res.status(401).json({ error: 'Invalid Google credentials' });
  }
};

const register = async (req, res) => {
  const { username, email, password, first_name, last_name, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }

  const userRole = role && ['admin', 'qc_user', 'upload_user', 'supervisor'].includes(role) 
    ? role 
    : 'upload_user';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (username, email, password, role, first_name, last_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, userRole, first_name || null, last_name || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        const newUser = {
          id: this.lastID,
          username,
          email,
          role: userRole,
          first_name,
          last_name
        };

        console.log('✅ User registered:', username, 'Role:', userRole);
        const token = generateToken(newUser);

        res.status(201).json({
          token,
          user: newUser,
          message: 'Registration successful'
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const changeRole = async (req, res) => {
  const { userId, newRole } = req.body;
  const requesterId = req.user.id;
  
  if (!['admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  if (!['admin', 'qc_user', 'upload_user', 'supervisor'].includes(newRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  db.run(
    'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newRole, userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log(`✅ Role changed for user ${userId} to ${newRole} by ${requesterId}`);
      res.json({ message: 'Role updated successfully' });
    }
  );
};

module.exports = {
  login,
  googleLogin,
  register,
  changeRole
};