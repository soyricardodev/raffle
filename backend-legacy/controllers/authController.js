const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');

const login = async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { username: req.body.username, hasPassword: !!req.body.password });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Buscar usuario
    console.log('🔍 Searching for user:', username);
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (rows.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    console.log('✅ User found:', { id: user.id, username: user.username, role: user.role });

    // Verificar contraseña
    console.log('🔑 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    console.log('✅ Password valid, generating token...');

    // Generar token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('✅ Token generated successfully');

    const response = {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

    console.log('✅ Login successful for user:', username);
    res.json(response);
  } catch (error) {
    console.error('💥 Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const verifyToken = async (req, res) => {
  try {
    console.log('🔍 Token verification for user:', req.user.username);
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('💥 Error en verify token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, role = 'admin' } = req.body;

    // Verificar si el usuario ya existe
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El usuario o email ya existe' });
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );

    console.log('✅ User created:', { id: result.insertId, username, role });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    console.error('💥 Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  login,
  verifyToken,
  createUser
};