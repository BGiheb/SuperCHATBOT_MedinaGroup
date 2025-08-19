const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

// Récupérer tous les utilisateurs (ADMIN seulement)
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (err) { next(err); }
};

// Récupérer un utilisateur par ID (ADMIN seulement)
exports.getUserById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
};

// Modifier un utilisateur (nom, email, rôle) (ADMIN seulement)
exports.updateUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, role } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
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
    const id = parseInt(req.params.id, 10);
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) { next(err); }
};

// Changer le mot de passe (utilisateur authentifié)
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    // Fetch user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};