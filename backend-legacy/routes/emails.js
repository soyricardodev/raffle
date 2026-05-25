const express = require('express');
const authenticateToken = require('../middleware/auth');
const { upload, handleMulterError } = require('../config/multer');
const emailController = require('../controllers/emailController');

const router = express.Router();

// GET /api/admin/emails/logs - Obtener logs de emails
router.get('/logs', emailController.getEmailLogs);

// GET /api/admin/emails/stats - Obtener estadísticas de emails
router.get('/stats', emailController.getEmailStats);

// POST /api/admin/emails/resend/:logId - Reenviar email
router.post('/resend/:logId', emailController.resendEmail);

// POST /api/admin/emails/test - Enviar email de prueba
router.post('/test', emailController.sendTestEmail);

module.exports = router;