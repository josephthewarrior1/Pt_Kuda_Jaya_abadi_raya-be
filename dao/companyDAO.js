const { db } = require('../config/firebase');
const cloudinary = require('../config/cloudinary');

class CompanyDAO {
  constructor() {
    this.companiesRef = db.ref('company_profiles');
  }

  // Get company profile by userId
  async getCompanyProfile(userId) {
    try {
      const snapshot = await this.companiesRef.child(userId).once('value');
      
      if (!snapshot.exists()) {
        // Return default if not exists
        return {
          companyName: '',
          companySubtitle: '',
          companyCity: '',
          companyLogo: null,
          createdAt: null,
          updatedAt: null
        };
      }
      
      return snapshot.val();
    } catch (error) {
      throw new Error('Failed to fetch company profile: ' + error.message);
    }
  }

  // Update company profile (text fields) - also creates if not exists
  async updateCompanyProfile(userId, profileData) {
    try {
      const currentProfile = await this.getCompanyProfile(userId);
      
      const dataToUpdate = {
        companyName: profileData.companyName || '',
        companySubtitle: profileData.companySubtitle || '',
        companyCity: profileData.companyCity || '',
        companyLogo: currentProfile.companyLogo || null, // Keep existing logo
        updatedAt: Date.now()
      };

      // Add createdAt if first time
      if (!currentProfile.createdAt) {
        dataToUpdate.createdAt = Date.now();
      } else {
        dataToUpdate.createdAt = currentProfile.createdAt;
      }

      await this.companiesRef.child(userId).set(dataToUpdate);
      
      return dataToUpdate;
    } catch (error) {
      throw new Error('Failed to update company profile: ' + error.message);
    }
  }

  // Upload company logo to Cloudinary
  async uploadCompanyLogo(userId, file) {
    try {
      const currentProfile = await this.getCompanyProfile(userId);
      
      // Check if company profile exists
      if (!currentProfile.createdAt) {
        throw new Error('Company profile does not exist. Please create profile first.');
      }

      // Delete old logo if exists
      if (currentProfile.companyLogo && currentProfile.companyLogo.publicId) {
        await cloudinary.uploader.destroy(currentProfile.companyLogo.publicId).catch(() => {
          console.log('⚠️ Old logo not found in Cloudinary, continuing...');
        });
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `company-logos/${userId}`,
            resource_type: 'image',
            transformation: [
              { width: 800, height: 400, crop: 'limit' },
              { quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(file.buffer);
      });

      const logoData = {
        url: result.secure_url,
        publicId: result.public_id,
        uploadedAt: Date.now(),
        width: result.width,
        height: result.height,
        format: result.format
      };

      // Update logo in profile
      await this.companiesRef.child(userId).update({
        companyLogo: logoData,
        updatedAt: Date.now()
      });

      return logoData;
    } catch (error) {
      throw new Error('Failed to upload company logo: ' + error.message);
    }
  }

  // Delete company logo
  async deleteCompanyLogo(userId) {
    try {
      const currentProfile = await this.getCompanyProfile(userId);
      
      if (!currentProfile.companyLogo) {
        return true;
      }

      // Delete from Cloudinary
      if (currentProfile.companyLogo.publicId) {
        await cloudinary.uploader.destroy(currentProfile.companyLogo.publicId).catch(() => {
          console.log('⚠️ Logo not found in Cloudinary, continuing...');
        });
      }

      // Remove logo from profile
      await this.companiesRef.child(userId).update({
        companyLogo: null,
        updatedAt: Date.now()
      });

      return true;
    } catch (error) {
      throw new Error('Failed to delete company logo: ' + error.message);
    }
  }
}

module.exports = new CompanyDAO();