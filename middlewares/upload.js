const multer = require('multer');

// Configure multer untuk memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (dinaikkan untuk foto mobil)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Buat middleware khusus untuk upload 4 foto mobil
const uploadCarPhotos = upload.fields([
  { name: 'leftSide', maxCount: 1 },
  { name: 'rightSide', maxCount: 1 },
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 }
]);

module.exports = {
  upload, // export upload biasa
  uploadCarPhotos // export middleware khusus untuk 4 foto
};