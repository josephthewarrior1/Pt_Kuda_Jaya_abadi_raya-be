const { admin } = require('../config/firebase');
const userDAO = require('../dao/userDAO');

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

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Debug: log decoded token
    console.log('🔐 Decoded Firebase token payload for UID:', decodedToken.uid);

    // Get user from database (using Firebase UID)
    const user = await userDAO.findById(decodedToken.uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found in database',
      });
    }

    // Attach user to request object DENGAN ROLE
    req.user = {
      id: user.id, // Should match decodedToken.uid
      uid: user.id, // Support old controllers using uid
      username: user.username,
      role: user.role,
      email: user.email || decodedToken.email || '',
      fullName: user.fullName || '',
    };
    
    console.log('✅ Auth middleware passed for user:', req.user.username, 'Role:', req.user.role);

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token or authentication failed',
    });
  }
};

module.exports = authMiddleware;