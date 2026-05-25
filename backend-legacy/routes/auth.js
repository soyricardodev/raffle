const express = require('express');
const { body } = require('express-validator');
const { login, verifyToken, createUser } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Rutas públicas
router.post('/login', [
  body('username').notEmpty().withMessage('Usuario requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], login);

// Rutas protegidas
router.get('/verify', authenticateToken, verifyToken);
router.post('/users', authenticateToken, [
  body('username').notEmpty().withMessage('Usuario requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role').isIn(['admin', 'user']).withMessage('Rol no válido')
], createUser);

module.exports = router;