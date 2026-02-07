const companyDAO = require('../dao/companyDAO');

class CompanyController {
  // Create initial company profile (first-time setup)
  async createCompanyProfile(req, res) {
    try {
      const userId = req.user.id;
      const { companyName, companySubtitle, companyCity } = req.body;

      // Validate required fields
      if (!companyName || !companyName.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Company name is required'
        });
      }

      // Cek apakah profile sudah ada
      const existingProfile = await companyDAO.getCompanyProfile(userId);
      
      // Jika sudah ada dan memiliki createdAt (bukan default), return error
      if (existingProfile.createdAt) {
        return res.status(400).json({
          success: false,
          error: 'Company profile already exists. Use update instead.'
        });
      }

      // Buat profile baru
      const newProfile = await companyDAO.updateCompanyProfile(userId, {
        companyName,
        companySubtitle: companySubtitle || '',
        companyCity: companyCity || ''
      });

      res.status(201).json({
        success: true,
        message: 'Company profile created successfully',
        profile: newProfile
      });
    } catch (error) {
      console.error('❌ Create company profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create company profile'
      });
    }
  }

  // Get company profile
  async getCompanyProfile(req, res) {
    try {
      const userId = req.user.id;

      const profile = await companyDAO.getCompanyProfile(userId);

      res.status(200).json({
        success: true,
        profile
      });
    } catch (error) {
      console.error('❌ Get company profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch company profile'
      });
    }
  }

  // Update company profile (name, subtitle, city)
  async updateCompanyProfile(req, res) {
    try {
      const userId = req.user.id;
      const { companyName, companySubtitle, companyCity } = req.body;

      // Validate required fields
      if (!companyName || !companyName.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Company name is required'
        });
      }

      const updatedProfile = await companyDAO.updateCompanyProfile(userId, {
        companyName,
        companySubtitle,
        companyCity
      });

      res.status(200).json({
        success: true,
        message: 'Company profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      console.error('❌ Update company profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update company profile'
      });
    }
  }

  // Upload company logo
  async uploadCompanyLogo(req, res) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No logo file provided'
        });
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          error: 'Only image files are allowed'
        });
      }

      // Validate file size (max 5MB)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: 'File size too large. Maximum 5MB allowed'
        });
      }

      const logoData = await companyDAO.uploadCompanyLogo(userId, req.file);

      console.log('✅ Company logo uploaded:', logoData.url);

      res.status(200).json({
        success: true,
        message: 'Company logo uploaded successfully',
        logo: logoData
      });
    } catch (error) {
      console.error('❌ Upload company logo error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload company logo'
      });
    }
  }

  // Delete company logo
  async deleteCompanyLogo(req, res) {
    try {
      const userId = req.user.id;

      await companyDAO.deleteCompanyLogo(userId);

      console.log('✅ Company logo deleted for user:', userId);

      res.status(200).json({
        success: true,
        message: 'Company logo deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete company logo error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete company logo'
      });
    }
  }
}

module.exports = new CompanyController();