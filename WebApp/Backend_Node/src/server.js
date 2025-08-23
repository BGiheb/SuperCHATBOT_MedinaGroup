require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Ensure Uploads directory exists (though not used with Cloudinary)
const uploadDir = path.join(__dirname, 'Uploads');
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.chmod(uploadDir, 0o755);
    console.log(`Uploads directory ensured at: ${uploadDir}`);
  } catch (err) {
    console.error('Error creating uploads directory:', err);
    throw new Error('Failed to create uploads directory');
  }
};

ensureUploadsDir().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});

// CORS configuration
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:8081'];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir)); // Keep for legacy compatibility

// Routes
const router = require('express').Router();
router.use('/auth', require('./routes/auth.routes'));
router.use('/platform', require('./routes/platform.routes'));
router.use('/chatbots', require('./routes/chatbot.routes'));
router.use('/users', require('./routes/user.routes'));
router.use('/documents', require('./routes/document.routes'));
router.use('/conversations', require('./routes/conversation.routes'));
app.use('/api', router);

// Root route
app.get('/', (req, res) => res.send('Chatbot SaaS API is up ✅'));

// Multer error handling
app.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({ message: `Multer error: ${err.message}` });
  }
  next(err);
});

// General error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));