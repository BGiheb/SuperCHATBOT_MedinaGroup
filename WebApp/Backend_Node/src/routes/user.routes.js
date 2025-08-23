const router = require('express').Router();
const userCtrl = require('../controllers/user.controller');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');

router.use(auth);
router.post('/change-password', userCtrl.changePassword);
router.use(requireRole('ADMIN'));
router.get('/', userCtrl.getAllUsers);
router.get('/:id', userCtrl.getUserById);
router.post('/sub-admin', userCtrl.createSubAdmin);
router.put('/:id', userCtrl.updateUser);
router.delete('/:id', userCtrl.deleteUser);
router.patch('/:id/password', userCtrl.changeUserPassword); // Updated to use changeUserPassword

module.exports = router;