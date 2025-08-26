const router = require('express').Router();
const auth = require('../middlewares/auth');
const ctrl = require('../controllers/conversation.controller');

router.get('/', auth, ctrl.getConversations);
router.delete('/:userId/:chatbotSlug', auth, ctrl.deleteConversation); // CHANGED: Use :chatbotSlug

module.exports = router;