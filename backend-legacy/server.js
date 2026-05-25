const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const raffleRoutes = require('./routes/raffles');
const ticketRoutes = require('./routes/tickets');
const purchaseRoutes = require('./routes/purchases');
const configRoutes = require('./routes/config');
const emailRoutes = require('./routes/emails');
const maintenanceRoutes = require('./routes/maintenance');

// Importar servicios
const raffleScheduler = require('./services/raffleScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting server...');
console.log('📁 Environment:', process.env.NODE_ENV || 'development');

// ─── 1) Configuración de Helmet PARA RELAJAR POLÍTICAS DE RECURSOS CRUZADOS ───
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "http://localhost:5000"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "https:", "data:"],
        connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000"],
      }
    }
  })
);

// ─── 2) Configuración CORS ───
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:4173', 'http://192.168.1.108:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ─── 3) Servir la carpeta de uploads como estática ───
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── 4) Middleware de logging para debugging ───
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body ? Object.keys(req.body) : 'no body');
  next();
});

// ─── 5) Rutas de tu API ───
app.use('/api/auth', authRoutes);
app.use('/api/raffles', raffleRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin/emails', emailRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  console.log('💓 Health check requested');
  res.json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    scheduler_active: true // INDICAR QUE EL SCHEDULER ESTÁ ACTIVO
  });
});

// ─── 6) Manejo de errores ───
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// ─── 7) Rutas no encontradas ───
app.use('*', (req, res) => {
  console.log('❓ Route not found:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── 8) INICIALIZAR SCHEDULER AUTOMÁTICO ───
const initializeScheduler = () => {
  try {
    console.log('⚙️ Inicializando sistema de mantenimiento automático...');

    // Iniciar el scheduler de rifas
    const schedulerTasks = raffleScheduler.start();

    console.log('✅ Sistema de mantenimiento iniciado exitosamente');
    console.log('🔄 El sistema verificará automáticamente:');
    console.log('   - Rifas vencidas: cada 5 minutos');

    // Manejar cierre graceful del servidor
    process.on('SIGTERM', () => {
      console.log('🔄 Cerrando servidor y deteniendo scheduler...');
      if (schedulerTasks.raffleTask) schedulerTasks.raffleTask.stop();
      if (schedulerTasks.ticketTask) schedulerTasks.ticketTask.stop();
      console.log('✅ Scheduler detenido correctamente');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('🔄 Cerrando servidor y deteniendo scheduler...');
      if (schedulerTasks.raffleTask) schedulerTasks.raffleTask.stop();
      if (schedulerTasks.ticketTask) schedulerTasks.ticketTask.stop();
      console.log('✅ Scheduler detenido correctamente');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error al inicializar scheduler:', error);
    console.error('⚠️ El servidor continuará funcionando sin mantenimiento automático');
  }
};

// ─── 9) Levantar servidor ───
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 API disponible en: http://localhost:${PORT}/api`);
  console.log(`💓 Health check: http://localhost:${PORT}/api/health`);

  // Inicializar el scheduler después de que el servidor esté listo
  setTimeout(() => {
    initializeScheduler();
  }, 1000);
});

module.exports = app;