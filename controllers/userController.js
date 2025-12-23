const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userDAO = require('../dao/userDAO');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Valid user roles
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  PAID_USER: 'paid_user'
};

class UserController {
  // Sign Up
  async signUp(req, res) {
    try {
      const { fullName, username, password, role } = req.body;

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

      // Validate and set role
      let userRole = USER_ROLES.USER; // Default
      if (role) {
        if (!Object.values(USER_ROLES).includes(role)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid role. Must be: admin, user, or paid_user',
          });
        }
        userRole = role;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user with specified role
      const newUser = await userDAO.createUser({
        fullName: fullName.trim(),
        username: username.trim(),
        password: hashedPassword,
        role: userRole,
      });

      console.log('✅ New user registered:', newUser.username, 'Role:', userRole);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: newUser.username,
          username: newUser.username,
          role: newUser.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: newUser.username,
          fullName: newUser.fullName,
          username: newUser.username,
          role: newUser.role,
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
          id: user.username,
          username: user.username,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      console.log('✅ User logged in:', user.username, 'Role:', user.role);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.username,
          fullName: user.fullName,
          username: user.username,
          role: user.role,
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
      const userId = req.user.id;

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
          role: user.role,
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
          role: updatedUser.role,
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

  // Admin Only: Update User Role (Manual Upgrade/Downgrade)
  async updateUserRole(req, res) {
    try {
      const { username } = req.params;
      const { role } = req.body;

      // Validate role
      if (!role || !Object.values(USER_ROLES).includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be: admin, user, or paid_user',
        });
      }

      const user = await userDAO.findByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Prevent admin from changing their own role
      if (username === req.user.username) {
        return res.status(400).json({
          success: false,
          error: 'You cannot change your own role',
        });
      }

      const updatedUser = await userDAO.updateUser(username, { role });

      console.log('✅ User role updated by admin:', username, '→', role);

      res.status(200).json({
        success: true,
        message: `User role updated to ${role} successfully`,
        user: {
          id: updatedUser.username,
          fullName: updatedUser.fullName,
          username: updatedUser.username,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      console.error('❌ Update role error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while updating user role',
      });
    }
  }

  // Admin Only: Get All Users
  async getAllUsers(req, res) {
    try {
      const users = await userDAO.getAllUsers();
      
      // Convert object to array and remove passwords
      const userList = Object.keys(users).map(username => ({
        id: username,
        fullName: users[username].fullName,
        username: username,
        role: users[username].role,
        createdAt: users[username].createdAt,
      }));

      res.status(200).json({
        success: true,
        count: userList.length,
        users: userList,
      });
    } catch (error) {
      console.error('❌ Get all users error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while fetching users',
      });
    }
  }

  // Admin Only: Delete User
  async deleteUser(req, res) {
    try {
      const { username } = req.params;

      // Prevent admin from deleting themselves
      if (username === req.user.username) {
        return res.status(400).json({
          success: false,
          error: 'You cannot delete your own account',
        });
      }

      const user = await userDAO.findByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      await userDAO.deleteUser(username);

      console.log('✅ User deleted by admin:', username);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while deleting user',
      });
    }
  }
}

module.exports = new UserController();