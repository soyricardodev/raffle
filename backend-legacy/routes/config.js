const express = require('express');
const { getConfig, updateConfig, uploadConfigImage } = require('../controllers/configController');
const authenticateToken = require('../middleware/auth');
const { upload, handleMulterError } = require('../config/multer');

const router = express.Router();

// Rutas públicas
router.get('/', getConfig);
router.get('/:key', getConfig);

// Rutas protegidas
router.put('/:key', authenticateToken, updateConfig);

// Ruta para subir imágenes de configuración
router.post('/upload', 
  authenticateToken, 
  upload.single('image'), 
  handleMulterError, 
  uploadConfigImage
);

module.exports = router;