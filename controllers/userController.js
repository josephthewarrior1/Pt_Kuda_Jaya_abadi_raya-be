const { admin } = require('../config/firebase');
const userDAO = require('../dao/userDAO');

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
      const { fullName, username, password, role, email } = req.body;

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

      // Validate email format kalau diisi
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
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

      // Create user in Firebase Auth with uid equal to username
      const userRecord = await admin.auth().createUser({
        uid: username.trim(),
        email: email ? email.trim().toLowerCase() : `${username.trim()}@kudajaya.local`,
        password: password,
        displayName: fullName.trim(),
      });

      // Map Firebase UID as our user ID
      const uid = userRecord.uid;

      // Set Custom Claims for role
      await admin.auth().setCustomUserClaims(uid, { role: userRole });

      // Create new user profile in Firestore
      const newUser = await userDAO.createUser({
        fullName: fullName.trim(),
        username: username.trim(),
        role: userRole,
        email: email ? email.trim().toLowerCase() : '',
        firebaseUid: uid,
      });

      console.log('✅ New user registered in Firebase and Firestore:', newUser.username, 'Role:', userRole);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: {
          id: newUser.id,
          fullName: newUser.fullName,
          username: newUser.username,
          role: newUser.role,
          email: newUser.email,
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

  // Login — support username ATAU email di satu field "login"
  async login(req, res) {
    try {
      const { login, password } = req.body;

      // Validation
      if (!login || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username/email and password are required',
        });
      }

      // Detect: kalau ada '@' berarti email, kalau tidak berarti username
      const user = login.includes('@')
        ? await userDAO.findByEmail(login)
        : await userDAO.findByUsername(login);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Login flow is now handled directly by the frontend using Firebase Web SDK. 
      // But we provide a minimal fallback check if absolutely necessary.
      // Usually hitting this endpoint means they are using the old flow.
      res.status(400).json({
        success: false,
        error: 'Login should be performed directly via Firebase client SDK.',
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
      const userId = req.user.username;

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
          email: user.email || '',
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

  // Update Profile — sekarang bisa update email juga
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

      // Validate email format kalau diisi
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      const updateData = {
        fullName: fullName.trim(),
        email: email ? email.trim().toLowerCase() : '',
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
          email: updatedUser.email || '',
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

      // Update password in Firebase Auth
      await admin.auth().updateUser(userId, {
        password: newPassword
      });

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

      const updatedUser = await userDAO.updateUser(user.id, { role });
      await admin.auth().setCustomUserClaims(user.id, { role });

      console.log('✅ User role updated by admin:', username, '→', role);

      res.status(200).json({
        success: true,
        message: `User role updated to ${role} successfully`,
        user: {
          id: updatedUser.username,
          fullName: updatedUser.fullName,
          username: updatedUser.username,
          role: updatedUser.role,
          email: updatedUser.email || '',
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
        email: users[username].email || '',
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