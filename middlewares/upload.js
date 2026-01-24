const multer = require('multer');

// Gunakan memory storage untuk serverless
const storage = multer.memoryStorage();

// Configure untuk Vercel (kurangi limit karena memory terbatas)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file (dikurangi untuk Vercel)
    files: 4,
    fieldSize: 10 * 1024 * 1024 // 10MB untuk fields
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware untuk 4 foto mobil
const uploadCarPhotos = upload.fields([
  { name: 'leftSide', maxCount: 1 },
  { name: 'rightSide', maxCount: 1 },
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 }
]);

// Error handler khusus multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.code);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum size is 5MB per file`
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
  upload,
  uploadCarPhotos,
  handleMulterError
};