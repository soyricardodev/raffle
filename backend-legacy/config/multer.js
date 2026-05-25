const multer = require('multer');
const path = require('path');
const fs = require('fs');

// directorios si no existen
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('📁 Directorio creado:', dir);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = '';

    // carpeta basada en la ruta de la petición
    if (req.route.path.includes('/config') || req.originalUrl.includes('/config')) {
      uploadPath = 'uploads/config/';
    } else if (req.route.path.includes('/raffles') || req.originalUrl.includes('/raffles')) {
      // Separaimágenes principales de premios
      if (file.fieldname === 'image') {
        uploadPath = 'uploads/raffles/';
      } else if (file.fieldname.startsWith('prize_image_')) {
        uploadPath = 'uploads/prizes/';
      } else {
        uploadPath = 'uploads/raffles/';
      }
    } else if (req.route.path.includes('/prizes') || req.originalUrl.includes('/prizes')) {
      uploadPath = 'uploads/prizes/';
    } else if (req.route.path.includes('/purchases') || req.originalUrl.includes('/purchases')) {
      uploadPath = 'uploads/payments/';
    } else {
      // Fallback para rutas no específicas
      uploadPath = 'uploads/general/';
    }

    // directorio si no existe
    createDirIfNotExists(uploadPath);
    console.log('📤 Subiendo archivo a:', uploadPath, 'Campo:', file.fieldname);

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    //  nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = file.fieldname || 'file';
    const filename = baseName + '-' + uniqueSuffix + extension;

    console.log('📄 Generando nombre del archivo:', filename, 'para campo:', file.fieldname);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('🔍 Validando archivo:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname,
    size: file.size
  });

  // Tipos de archivo permitidos
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocTypes = /pdf/;

  const extname = path.extname(file.originalname).toLowerCase();
  const isValidImageExt = allowedImageTypes.test(extname.substring(1));
  const isValidDocExt = allowedDocTypes.test(extname.substring(1));

  const isValidImageMime = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
  const isValidDocMime = /^application\/pdf$/i.test(file.mimetype);

  const isValidFile = (isValidImageExt && isValidImageMime) || (isValidDocExt && isValidDocMime);

  console.log('✅ Validación de archivo:', {
    fieldname: file.fieldname,
    extname,
    isValidImageExt,
    isValidDocExt,
    isValidImageMime,
    isValidDocMime,
    isValidFile
  });

  if (isValidFile) {
    return cb(null, true);
  } else {
    const error = new Error('Solo se permiten imágenes (JPEG, JPG, PNG, GIF, WEBP) y documentos PDF');
    error.code = 'INVALID_FILE_TYPE';
    cb(error);
  }
};

// Configuración de multer para MÚLTIPLES archivos
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo por archivo
    files: 50 // Máximo 50 archivos (1 imagen principal + hasta 49 premios)
  },
  fileFilter: fileFilter
});

// Configuración específica para rifas (imagen principal + imágenes de premios)
const uploadRaffleFiles = upload.fields([
  { name: 'image', maxCount: 1 }, // Imagen principal
  { name: 'prize_image_0', maxCount: 1 },
  { name: 'prize_image_1', maxCount: 1 },
  { name: 'prize_image_2', maxCount: 1 },
  { name: 'prize_image_3', maxCount: 1 },
  { name: 'prize_image_4', maxCount: 1 },
  { name: 'prize_image_5', maxCount: 1 },
  { name: 'prize_image_6', maxCount: 1 },
  { name: 'prize_image_7', maxCount: 1 },
  { name: 'prize_image_8', maxCount: 1 },
  { name: 'prize_image_9', maxCount: 1 },
  { name: 'prize_image_10', maxCount: 1 },
  { name: 'prize_image_11', maxCount: 1 },
  { name: 'prize_image_12', maxCount: 1 },
  { name: 'prize_image_13', maxCount: 1 },
  { name: 'prize_image_14', maxCount: 1 },
  { name: 'prize_image_15', maxCount: 1 },
  { name: 'prize_image_16', maxCount: 1 },
  { name: 'prize_image_17', maxCount: 1 },
  { name: 'prize_image_18', maxCount: 1 },
  { name: 'prize_image_19', maxCount: 1 }
  // Hasta 20 premios, 
]);

// Middleware para manejo de errores de multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('💥 Error de Multer:', error);

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'El archivo es demasiado grande. Máximo 50MB permitido.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Demasiados archivos. Máximo 50 archivos permitidos.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: `Campo de archivo inesperado: ${error.field}. Verifica que el nombre del campo sea correcto.`
        });
      default:
        return res.status(400).json({
          error: 'Error al procesar el archivo: ' + error.message
        });
    }
  } else if (error && error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: error.message });
  }

  next(error);
};

module.exports = {
  upload,
  uploadRaffleFiles,
  handleMulterError
};