const { db } = require('../config/firebase');

class UserDAO {
  constructor() {
    this.usersRef = db.ref('users');
  }

  // Get all users
  async getAllUsers() {
    try {
      const snapshot = await this.usersRef.once('value');
      return snapshot.val() || {};
    } catch (error) {
      throw new Error('Failed to fetch users: ' + error.message);
    }
  }

  // Find user by username
  async findByUsername(username) {
    try {
      const snapshot = await this.usersRef.child(username).once('value');
      if (!snapshot.exists()) return null;
      
      return { id: username, ...snapshot.val() };
    } catch (error) {
      throw new Error('Failed to find user by username: ' + error.message);
    }
  }

  // Find user by ID (username)
  async findById(userId) {
    try {
      const snapshot = await this.usersRef.child(userId).once('value');
      if (!snapshot.exists()) return null;
      
      return { id: userId, ...snapshot.val() };
    } catch (error) {
      throw new Error('Failed to find user by ID: ' + error.message);
    }
  }

  // Create new user - PAKAI USERNAME SEBAGAI KEY
  async createUser(userData) {
    try {
      const { username } = userData;
      
      // Check if username already exists
      const existingUser = await this.findByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }
      
      const dataToSave = {
        ...userData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Save dengan username sebagai key
      await this.usersRef.child(username).set(dataToSave);
      
      return { id: username, ...dataToSave };
    } catch (error) {
      throw new Error('Failed to create user: ' + error.message);
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      const dataToUpdate = {
        ...updateData,
        updatedAt: Date.now(),
      };
      
      await this.usersRef.child(userId).update(dataToUpdate);
      
      return await this.findById(userId);
    } catch (error) {
      throw new Error('Failed to update user: ' + error.message);
    }
  }

  // Check if username exists
  async usernameExists(username) {
    try {
      const user = await this.findByUsername(username);
      return user !== null;
    } catch (error) {
      throw new Error('Failed to check username: ' + error.message);
    }
  }

  async deleteUser(username) {
    try {
      await this.usersRef.child(username).remove();
      return true;
    } catch (error) {
      throw new Error('Failed to delete user: ' + error.message);
    }
  }
}


module.exports = new UserDAO();