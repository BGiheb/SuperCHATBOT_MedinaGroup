const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// In-memory storage (replace with database in production)
let currentLogoUrl = null;
let currentPublicId = null; // Track public ID for deletion

// Authentication middleware (placeholder, integrate with your auth middleware)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  // Integrate with your auth.js middleware logic here
  next();
};

// POST /api/platform/logo
router.post('/logo', authMiddleware, upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'platform_logos',
          resource_type: 'image',
          public_id: `logo_${Date.now()}`, // Unique public ID
        },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(req.file.buffer);
    });

    // Update current logo URL and public ID
    currentLogoUrl = result.secure_url;
    currentPublicId = result.public_id;
    console.log('Uploaded logo:', { url: currentLogoUrl, publicId: currentPublicId });

    res.json({ logoUrl: currentLogoUrl });
  } catch (err) {
    console.error('Upload error:', err);
    next(err);
  }
});

// GET /api/platform/logo
router.get('/logo', authMiddleware, (req, res) => {
  res.json({ logoUrl: currentLogoUrl });
});

// DELETE /api/platform/logo
router.delete('/logo', authMiddleware, async (req, res, next) => {
  try {
    if (currentLogoUrl && currentPublicId) {
      await cloudinary.uploader.destroy(currentPublicId);
      currentLogoUrl = null;
      currentPublicId = null;
    }
    res.json({ message: 'Logo deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    next(err);
  }
});

module.exports = router;