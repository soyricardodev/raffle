const db = require('../config/database');

const getConfig = async (req, res) => {
  try {
    const { key } = req.params;

    console.log('🔧 Obteniendo configuración:', key || 'all');

    if (key) {
      const [rows] = await db.execute(
        'SELECT * FROM site_config WHERE config_key = ?',
        [key]
      );

      if (rows.length === 0) {
        console.log('❌ Configuración no encontrada:', key);
        return res.status(404).json({ error: 'Configuración no encontrada' });
      }

      const configItem = rows[0];
      let parsedValue;

      try {
        parsedValue = typeof configItem.config_value === 'string'
          ? JSON.parse(configItem.config_value)
          : configItem.config_value;
      } catch (e) {
        parsedValue = configItem.config_value;
      }

      console.log('✅ Configuración encontrada:', key, parsedValue);
      res.json({ ...configItem, config_value: parsedValue });
    } else {
      const [rows] = await db.execute('SELECT * FROM site_config ORDER BY config_key');

      const config = {};
      rows.forEach(row => {
        try {
          config[row.config_key] = typeof row.config_value === 'string'
            ? JSON.parse(row.config_value)
            : row.config_value;
        } catch (e) {
          console.warn('⚠️ Error parseando config:', row.config_key, e.message);
          config[row.config_key] = row.config_value;
        }
      });

      console.log('✅ Configuración completa obtenida');
      res.json(config);
    }
  } catch (error) {
    console.error('💥 Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    console.log('🔧 Actualizando configuración:', key);
    console.log('📝 Valor recibido:', value);

    if (!key) {
      return res.status(400).json({ error: 'Key de configuración requerida' });
    }

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Valor de configuración requerido' });
    }

    // Obtener el valor actual si existe para hacer merge
    let currentValue = {};
    try {
      const [currentRows] = await db.execute(
        'SELECT config_value FROM site_config WHERE config_key = ?',
        [key]
      );

      if (currentRows.length > 0) {
        currentValue = typeof currentRows[0].config_value === 'string'
          ? JSON.parse(currentRows[0].config_value)
          : currentRows[0].config_value;
      }
    } catch (parseError) {
      console.warn('⚠️ Error parseando valor actual:', parseError.message);
      currentValue = {};
    }

    // Si el valor nuevo es un objeto y el actual también, hacer merge
    let finalValue = value;
    if (typeof value === 'object' && value !== null && typeof currentValue === 'object' && currentValue !== null) {
      finalValue = { ...currentValue, ...value };
      console.log('🔄 Haciendo merge de configuración:', finalValue);
    }

    // Convertir el valor a JSON string
    const jsonValue = JSON.stringify(finalValue);
    console.log('💾 Guardando como JSON:', jsonValue);

    const [result] = await db.execute(
      `REPLACE INTO site_config (config_key, config_value, updated_at) VALUES (?, ?, NOW())`,
      [key, jsonValue]
    );

    console.log('✅ Configuración actualizada:', key, 'affected rows:', result.affectedRows);

    // Verificar que se guardó correctamente
    const [verification] = await db.execute(
      'SELECT config_value FROM site_config WHERE config_key = ?',
      [key]
    );

    console.log('🔍 Verificación - valor guardado:', verification[0]?.config_value);

    res.json({
      message: 'Configuración actualizada exitosamente',
      key: key,
      affected_rows: result.affectedRows,
      saved_value: verification[0]?.config_value
    });
  } catch (error) {
    console.error('💥 Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
};

const uploadConfigImage = async (req, res) => {
  try {
    console.log('📤 Subiendo imagen de configuración...');
    console.log('📁 Archivo recibido:', req.file ? req.file.filename : 'ninguno');
    console.log('📂 Ruta completa:', req.file ? req.file.path : 'ninguno');

    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    // Construir la URL correcta
    // req.file.destination ya incluye la ruta completa como 'uploads/config/'
    const folderName = req.file.destination.replace('uploads/', '').replace('/', '');
    const imageUrl = `/uploads/${folderName}/${req.file.filename}`;

    console.log('✅ Imagen subida exitosamente:', imageUrl);

    res.json({
      message: 'Imagen subida exitosamente',
      url: imageUrl
    });
  } catch (error) {
    console.error('💥 Error al subir imagen:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  uploadConfigImage
};