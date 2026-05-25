-- =====================================================
-- Migración: Agregar min_tickets y customer_location
-- Fecha: 2024
-- Descripción: 
--   - Agrega columna min_tickets a payment_methods para configurar mínimo de tickets por método
--   - Agrega columna customer_location a purchases para almacenar ubicación del cliente
-- =====================================================

USE raffle_db;

-- Agregar columna min_tickets a payment_methods
-- Esta columna permite configurar un mínimo de tickets requeridos para mostrar cada método de pago
-- NULL o 0 significa que no hay mínimo (se muestra siempre)
ALTER TABLE payment_methods 
ADD COLUMN min_tickets INT DEFAULT NULL 
COMMENT 'Mínimo de tickets requeridos para mostrar este método de pago. NULL o 0 = sin mínimo';

-- Agregar columna customer_location a purchases
-- Esta columna almacena la ubicación del cliente (país y estado/ciudad)
-- Ejemplo: "Venezuela, Caracas" o "Colombia, Bogotá"
ALTER TABLE purchases 
ADD COLUMN customer_location VARCHAR(100) DEFAULT NULL 
COMMENT 'Ubicación del cliente (país, estado/ciudad)';

-- Verificar que las columnas se agregaron correctamente
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'raffle_db' 
    AND TABLE_NAME IN ('payment_methods', 'purchases')
    AND COLUMN_NAME IN ('min_tickets', 'customer_location')
ORDER BY TABLE_NAME, COLUMN_NAME;

