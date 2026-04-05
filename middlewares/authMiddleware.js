const jwt = require('jsonwebtoken');
const userDAO = require('../dao/userDAO');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Debug: log decoded token
    console.log('🔐 Decoded token payload:', decoded);

    // Get user from database
    const user = await userDAO.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Attach user to request object DENGAN ROLE
    req.user = {
      id: user.id,
      uid: user.id, // Support old controllers using uid
      username: user.username,
      role: user.role, // <-- TAMBAHKAN INI!
      email: user.email || '',      // ← TAMBAH INI
      fullName: user.fullName || '', // ← TAMBAH INI
    };
    
    console.log('✅ Auth middleware passed for user:', req.user.username, 'Role:', req.user.role);

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

module.exports = authMiddleware;