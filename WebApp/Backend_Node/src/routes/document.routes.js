const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const uploadDir = path.join(__dirname, '../Uploads');

// Ensure Uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.chmod(uploadDir, 0o755); // Ensure write permissions
    console.log(`Uploads directory ensured at: ${uploadDir}`);
  } catch (err) {
    console.error('Error creating uploads directory:', err);
    throw new Error('Failed to create uploads directory');
  }
};

// Initialize uploads directory
ensureUploadsDir().catch((err) => {
  console.error('Startup error in document.routes:', err);
  throw err;
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  // No fileFilter to allow any file type, like createChatbot
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Clean up temporary file after response is sent
const cleanupFile = async (req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (req.file) {
      fs.unlink(req.file.path).catch((err) => console.error('Error deleting temp file:', err));
    }
    return originalJson.call(this, data);
  };
  next();
};

router.get('/', authMiddleware, documentController.getDocumentsByChatbot);
router.post('/', authMiddleware, upload.single('document'), cleanupFile, documentController.uploadDocument);
router.put('/:id', authMiddleware, upload.single('document'), cleanupFile, documentController.replaceDocument);
router.delete('/:id', authMiddleware, documentController.deleteDocument);
router.get('/:id/download', authMiddleware, documentController.downloadDocument);

module.exports = router;