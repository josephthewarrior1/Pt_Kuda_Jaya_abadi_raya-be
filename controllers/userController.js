const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userDAO = require('../dao/userDAO');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

class UserController {
  // Sign Up
  async signUp(req, res) {
    try {
      const { fullName, username, password } = req.body;

      // Validation
      if (!fullName || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Full name, username and password are required',
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
        });
      }

      // Validate username length
      if (username.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Username must be at least 4 characters',
        });
      }

      // Check if username already exists
      const usernameExists = await userDAO.usernameExists(username);
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = await userDAO.createUser({
        fullName: fullName.trim(),
        username: username.trim(),
        password: hashedPassword,
      });

      console.log('✅ New user registered:', newUser.username);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: newUser.username, // PAKAI USERNAME SEBAGAI ID
          username: newUser.username,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: newUser.username, // PAKAI USERNAME SEBAGAI ID
          fullName: newUser.fullName,
          username: newUser.username,
        },
      });
    } catch (error) {
      console.error('❌ Sign up error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during sign up',
      });
    }
  }

  // Login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validation
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required',
        });
      }

      // Find user by username
      const user = await userDAO.findByUsername(username);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);

      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.username, // PAKAI USERNAME SEBAGAI ID
          username: user.username,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      console.log('✅ User logged in:', user.username);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.username, // PAKAI USERNAME SEBAGAI ID
          fullName: user.fullName,
          username: user.username,
        },
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during login',
      });
    }
  }

  // Get Profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id; // From auth middleware

      const user = await userDAO.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.username,
          fullName: user.fullName,
          username: user.username,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching profile',
      });
    }
  }

  // Update Profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { fullName } = req.body;

      if (!fullName) {
        return res.status(400).json({
          success: false,
          error: 'Full name is required',
        });
      }

      const updateData = {
        fullName: fullName.trim()
      };

      const updatedUser = await userDAO.updateUser(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.username,
          fullName: updatedUser.fullName,
          username: updatedUser.username,
        },
      });
    } catch (error) {
      console.error('❌ Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while updating profile',
      });
    }
  }

  // Change Password
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
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

      // Verify current password
      const passwordValid = await bcrypt.compare(currentPassword, user.password);

      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await userDAO.updateUser(userId, { password: hashedPassword });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('❌ Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while changing password',
      });
    }
  }
}

module.exports = new UserController();