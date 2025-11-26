const { db } = require('../config/firebase');

const verifyCustomToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    console.log('🔐 Verifying custom token...');

    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      const uid = payload.uid;

      if (!uid) {
        throw new Error('No UID in token');
      }

      console.log('✅ Custom token decoded - UID:', uid);

      const usersRef = db.ref('users');
      const snapshot = await usersRef
        .orderByChild('uid')
        .equalTo(uid)
        .once('value');

      let userData = null;
      let userId = null;

      snapshot.forEach((childSnapshot) => {
        userId = childSnapshot.key;
        userData = childSnapshot.val();
      });

      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'User not found in database',
        });
      }

      req.userId = parseInt(userId);
      req.userData = userData;
      req.user = { uid: uid };

      console.log(
        '✅ User authenticated - ID:',
        userId,
        'Email:',
        userData.email
      );
      next();
    } catch (decodeError) {
      console.error('❌ Token decode failed:', decodeError.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);

    return res.status(401).json({
      success: false,
      error: 'Authentication failed: ' + error.message,
    });
  }
};

module.exports = { verifyCustomToken };
