const router = require('express').Router();
const userCtrl = require('../controllers/user.controller');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');

// Routes requiring authentication + ADMIN role
router.use(auth, requireRole('ADMIN'));

router.get('/', userCtrl.getAllUsers);          // Liste tous les users
router.get('/:id', userCtrl.getUserById);       // Détail user
router.put('/:id', userCtrl.updateUser);        // Modifier nom, email, role
router.delete('/:id', userCtrl.deleteUser);     // Supprimer

// Route for changing password (authentication only, no ADMIN required)
router.post('/change-password', auth, userCtrl.changePassword);

module.exports = router;