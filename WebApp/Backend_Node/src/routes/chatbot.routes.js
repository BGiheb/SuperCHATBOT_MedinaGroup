const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/chatbot.controller');
const auth = require('../middlewares/auth');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'Uploads');
    console.log('Multer destination:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\s+/g, '_');
    const filename = `${Date.now()}-${sanitizedName}`;
    console.log('Multer saving file as:', filename);
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      console.log('File type accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.error('Invalid file type:', file.mimetype);
      cb(new Error('Invalid file type. Only PNG, JPEG, PDF, and TXT are allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Routes
router.post(
  '/',
  auth,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'documents', maxCount: 10 },
  ]),
  ctrl.createChatbot
);

router.put(
  '/:id',
  auth,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'documents', maxCount: 10 },
  ]),
  ctrl.updateChatbot
);
router.get('/user-stats', auth, ctrl.getUserStats); 
router.get('/my', auth, ctrl.listMyChatbots); 
router.get('/', auth, ctrl.listMyChatbots)
router.get('/qr-codes', auth, ctrl.getQRCodes);
router.get('/:id',ctrl.getChatbot);
router.post('/:id/messages', ctrl.sendMessage);
router.get('/:id/stats', auth, ctrl.getChatbotStats);
router.get('/:id/conversations', ctrl.getConversations);
router.post(
  '/:id/documents',
  auth,
  upload.array('documents', 10),
  ctrl.uploadDocuments
);
router.post('/:id/regenerate-qr', auth, ctrl.regenerateQRCode);
router.post('/:id/end-session', ctrl.endSession);
router.get('/:id/edit', auth, ctrl.getChatbotForEdit); // New endpoint

module.exports = router;