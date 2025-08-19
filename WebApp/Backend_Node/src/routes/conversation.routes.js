// conversation.routes.js
const router = require('express').Router();
const auth = require('../middlewares/auth');
const ctrl = require('../controllers/conversation.controller');

router.get('/', auth, ctrl.getConversations);
router.delete('/:userId/:chatbotId', auth, ctrl.deleteConversation); // Updated route

module.exports = router;