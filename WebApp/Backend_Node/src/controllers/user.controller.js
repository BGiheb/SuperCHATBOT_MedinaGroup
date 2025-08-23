const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

// Récupérer tous les utilisateurs (ADMIN seulement)
exports.getAllUsers = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, createdById: true }
    });
    res.json(users);
  } catch (err) { next(err); }
};

// Récupérer un utilisateur par ID (ADMIN seulement)
exports.getUserById = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, createdById: true }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
};

// Créer un utilisateur (ADMIN ou SUB_ADMIN) (ADMIN seulement)
exports.createSubAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Email, password, name, and role are required' });
    }

    // Validate role
    if (!['ADMIN', 'SUB_ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email already used' });

    const hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        role,
        createdById: req.user.id,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    res.status(201).json(newUser);
  } catch (err) { next(err); }
};

// Modifier un utilisateur (nom, email, rôle) (ADMIN seulement)
exports.updateUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const id = parseInt(req.params.id, 10);
    const { name, email, role } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Validate role
    if (role && !['ADMIN', 'SUB_ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if the new email is already used by another user
    const existingUser = await prisma.user.findFirst({
      where: { email, id: { not: id } },
    });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already used' });
    }

    // Update user data, preserving unchanged fields
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        name: name || undefined,
        email: email || undefined,
        role: role || undefined
      },
      select: { id: true, name: true, email: true, role: true }
    });

    res.json(updatedUser);
  } catch (err) { next(err); }
};

// Supprimer un utilisateur (ADMIN seulement)
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'ADMIN') {
      return res.status(403).json({ message: 'Cannot delete an admin user' });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) { next(err); }
};

// Changer le mot de passe (utilisateur authentifié)
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// Changer le mot de passe d'un utilisateur (ADMIN ou SUB_ADMIN) (ADMIN seulement)
exports.changeUserPassword = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const id = parseInt(req.params.id, 10);
    const { newPassword } = req.body;

    if (!newPassword && newPassword !== '') {
      return res.status(400).json({ message: 'New password is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!['ADMIN', 'SUB_ADMIN'].includes(user.role)) {
      return res.status(403).json({ message: 'Can only change password for ADMIN or SUB_ADMIN users' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'User password changed successfully' });
  } catch (err) {
    next(err);
  }
};