const { admin } = require('../config/firebase');
const userDAO = require('../dao/userDAO');

const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  'AIzaSyBg72_imTZRZ9RaZs9_9X3eRdDLVrHmuag';

const signInWithFirebasePassword = async (email, password) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    const code = result.error && result.error.message;
    const error = new Error(code || 'Firebase sign-in failed');
    error.status = 401;
    throw error;
  }

  return result;
};

const buildUserResponse = user => ({
  id: user.id || user.username,
  fullName: user.fullName,
  username: user.username,
  email: user.email || '',
});

class UserController {
  async signUp(req, res) {
    try {
      const { fullName, username, password, email } = req.body;
      const normalizedUsername = username ? username.trim() : '';
      const normalizedEmail = email ? email.trim().toLowerCase() : '';

      if (!fullName || !username || !password || !normalizedEmail) {
        return res.status(400).json({
          success: false,
          error: 'Full name, username, email and password are required',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
        });
      }

      if (normalizedUsername.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Username must be at least 4 characters',
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      const usernameExists = await userDAO.usernameExists(normalizedUsername);
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken',
        });
      }

      const emailExists = await userDAO.emailExists(normalizedEmail);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }

      const userRecord = await admin.auth().createUser({
        uid: normalizedUsername,
        email: normalizedEmail,
        password,
        displayName: fullName.trim(),
      });

      const newUser = await userDAO.createUser({
        fullName: fullName.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        firebaseEmail: normalizedEmail,
        firebaseUid: userRecord.uid,
      });

      console.log('New user registered in Firebase and Firestore:', newUser.username);

      const firebaseSession = await signInWithFirebasePassword(normalizedEmail, password);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token: firebaseSession.idToken,
        refreshToken: firebaseSession.refreshToken,
        expiresIn: firebaseSession.expiresIn,
        user: buildUserResponse(newUser),
      });
    } catch (error) {
      console.error('Sign up error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error during sign up',
      });
    }
  }

  async login(req, res) {
    try {
      const { login, password } = req.body;

      if (!login || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username/email and password are required',
        });
      }

      const user = login.includes('@')
        ? await userDAO.findByEmail(login)
        : await userDAO.findByUsername(login);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      const authEmail = user.firebaseEmail || user.email;
      if (!authEmail) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      const firebaseSession = await signInWithFirebasePassword(authEmail, password);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: firebaseSession.idToken,
        refreshToken: firebaseSession.refreshToken,
        expiresIn: firebaseSession.expiresIn,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error during login',
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await userDAO.findById(req.user.username);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          ...buildUserResponse(user),
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while fetching profile',
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.username;
      const { fullName, email } = req.body;

      if (!fullName) {
        return res.status(400).json({
          success: false,
          error: 'Full name is required',
        });
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      const updatedUser = await userDAO.updateUser(userId, {
        fullName: fullName.trim(),
        email: email ? email.trim().toLowerCase() : '',
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: buildUserResponse(updatedUser),
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while updating profile',
      });
    }
  }

  async changePassword(req, res) {
    try {
      const userId = req.user.username;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current and new password are required',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters',
        });
      }

      const user = await userDAO.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      await admin.auth().updateUser(userId, { password: newPassword });

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error while changing password',
      });
    }
  }
}

module.exports = new UserController();
