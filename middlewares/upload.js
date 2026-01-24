const multer = require('multer');

// Gunakan memory storage untuk serverless
const storage = multer.memoryStorage();

// Base configuration
const baseConfig = {
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
};

// Middleware untuk 6 foto mobil (termasuk STNK dan dashboard)
const uploadCarPhotos = multer({
  ...baseConfig,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 6 // max 6 files
  }
}).fields([
  { name: 'stnk', maxCount: 1 },
  { name: 'leftSide', maxCount: 1 },
  { name: 'rightSide', maxCount: 1 },
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'dashboard', maxCount: 1 }
]);

// Middleware untuk upload KTP photo (single file)
const uploadKtpPhoto = multer({
  ...baseConfig,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 1
  }
}).single('ktpPhoto'); // field name: 'ktpPhoto'

// Middleware untuk upload insurance documents (PDF, images, Word)
const uploadInsuranceDocuments = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and Word documents are allowed'));
    }
  }
}).array('documents', 5); // field name: 'documents', max 5 files

// Error handler khusus multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.code);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum size is ${err.field === 'ktpPhoto' ? '5MB' : err.field === 'documents' ? '10MB' : '5MB'} per file`
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: `Too many files. Maximum is ${err.field === 'documents' ? '5' : '6'} files`
      });
    }
    
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }
  
  if (err) {
    console.error('Upload error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'File upload failed'
    });
  }
  
  next();
};

module.exports = {
  uploadCarPhotos,
  uploadKtpPhoto,
  uploadInsuranceDocuments,
  handleMulterError
};