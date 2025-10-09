const jwt = require('jsonwebtoken');
const { db } = require('../models/database');

const authenticateToken = (req, res, next) => {
  console.log('Auth middleware called for:', req.method, req.path);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth header:', authHeader);
  console.log('Token:', token ? 'Token present' : 'No token');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('JWT verification successful, user:', user);
    req.user = user;
    next();
  });
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    db.get(
      `SELECT rp.permission 
       FROM role_permissions rp 
       WHERE rp.role = ? AND rp.permission = ?
       UNION
       SELECT up.permission_name as permission
       FROM user_permissions up 
       WHERE up.user_id = ? AND up.permission_name = ?`,
      [req.user.role, permission, req.user.id, permission],
      (err, result) => {
        if (err) {
          console.error('Permission check error:', err);
          return res.status(500).json({ error: 'Permission check failed' });
        }

        if (!result) {
          return res.status(403).json({ 
            error: 'Permission denied',
            required: permission,
            user_role: req.user.role
          });
        }

        next();
      }
    );
  };
};

// Middleware to authenticate token from query params (for iframe/direct access)
const authenticateTokenFromQuery = (req, res, next) => {
  console.log('Auth from query middleware called for:', req.method, req.path);
  
  // Check query params first, then headers
  const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  
  console.log('Token source:', req.query.token ? 'Query param' : 'Header');
  console.log('Token:', token ? 'Token present' : 'No token');
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('JWT verification successful from query/header, user:', user);
    req.user = user;
    next();
  });
};

const adminOnly = requireRole(['admin']);
const supervisorOrAdmin = requireRole(['admin', 'supervisor']);
const qcUserOrAbove = requireRole(['admin', 'supervisor', 'qc_user']);

module.exports = {
  authenticateToken,
  authenticateTokenFromQuery,
  requireRole,
  requirePermission,
  adminOnly,
  supervisorOrAdmin,
  qcUserOrAbove
};