const { db } = require('../config/firebase');

class UserDAO {
  constructor() {
    this.usersRef = db.collection('users');
  }

  // Get all users
  async getAllUsers() {
    try {
      const snapshot = await this.usersRef.get();
      if (snapshot.empty) return {};
      
      const users = {};
      snapshot.forEach(doc => {
        users[doc.id] = doc.data();
      });
      return users;
    } catch (error) {
      throw new Error('Failed to fetch users: ' + error.message);
    }
  }

  // Find user by username
  async findByUsername(username) {
    try {
      const doc = await this.usersRef.doc(username).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error('Failed to find user by username: ' + error.message);
    }
  }

  // Find user by email (scan all users)
  async findByEmail(email) {
    try {
      const snapshot = await this.usersRef
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();
        
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error('Failed to find user by email: ' + error.message);
    }
  }

  // Find user by ID (document ID - could be username or Firebase UID)
  async findById(userId) {
    try {
      const doc = await this.usersRef.doc(userId).get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
      
      // Fallback: search by firebaseUid field (for users created before UID-as-doc-id)
      return await this.findByFirebaseUid(userId);
    } catch (error) {
      throw new Error('Failed to find user by ID: ' + error.message);
    }
  }

  // Find user by Firebase Auth UID field
  async findByFirebaseUid(uid) {
    try {
      const snapshot = await this.usersRef
        .where('firebaseUid', '==', uid)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error('Failed to find user by firebaseUid: ' + error.message);
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

      // Save dengan username sebagai nama document
      await this.usersRef.doc(username).set(dataToSave);

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

      await this.usersRef.doc(userId).update(dataToUpdate);

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

  // Check if email exists
  async emailExists(email) {
    try {
      const user = await this.findByEmail(email);
      return user !== null;
    } catch (error) {
      throw new Error('Failed to check email: ' + error.message);
    }
  }

  // Delete user
  async deleteUser(username) {
    try {
      await this.usersRef.doc(username).delete();
      return true;
    } catch (error) {
      throw new Error('Failed to delete user: ' + error.message);
    }
  }
}

module.exports = new UserDAO();
