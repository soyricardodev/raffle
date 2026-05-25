-- Crear base de datos
CREATE DATABASE IF NOT EXISTS raffle_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE raffle_db;

-- Tabla de usuarios (administradores)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'super_admin') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de rifas
CREATE TABLE raffles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    total_tickets INT NOT NULL,
    price_bs DECIMAL(15,2) NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    min_purchase INT DEFAULT 1,
    max_purchase INT DEFAULT 10,
    draw_date DATETIME,
    percentage_mode BOOLEAN DEFAULT FALSE,
    activation_percentage INT DEFAULT NULL,
    days_for_draw INT DEFAULT NULL,
    status ENUM('draft', 'active', 'finished', 'cancelled') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de premios
CREATE TABLE prizes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    raffle_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    position INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE
);

-- Tabla de métodos de pago
CREATE TABLE payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    raffle_id INT NOT NULL,
    method_type ENUM('zinli', 'zelle', 'binance', 'bs', 'usd') NOT NULL,
    account_info JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE
);

-- Tabla de compras
CREATE TABLE purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    raffle_id INT NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(100),
    customer_ci VARCHAR(20),
    payment_method ENUM('zinli', 'zelle', 'binance', 'bs', 'usd') NOT NULL,
    payment_reference VARCHAR(100),
    payment_proof_url VARCHAR(500),
    ticket_quantity INT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE
);

-- Tabla de boletos
CREATE TABLE tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    raffle_id INT NOT NULL,
    purchase_id INT,
    ticket_number INT NOT NULL,
    status ENUM('available', 'reserved', 'sold') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
    UNIQUE KEY unique_raffle_ticket (raffle_id, ticket_number)
);

-- Tabla de configuración del sitio
CREATE TABLE site_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX idx_raffles_status ON raffles(status);
CREATE INDEX idx_tickets_raffle_status ON tickets(raffle_id, status);
CREATE INDEX idx_purchases_raffle_status ON purchases(raffle_id, status);
CREATE INDEX idx_purchases_phone ON purchases(customer_phone);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_purchases_created ON purchases(created_at);
CREATE INDEX idx_raffles_created ON raffles(created_at);

-- Datos iniciales
-- Usuario administrador por defecto (contraseña: admin123)
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@rifas.com', '$2b$10$rOYwjLdxZQGYFzqf3LLGn.g1z5H8mU9gY8EhVvH.Y9KPxqQ8iO.Jq', 'super_admin');

-- Configuración inicial del sitio
INSERT INTO site_config (config_key, config_value, description) VALUES
('site_colors', '{"primary": "#8B7355", "secondary": "#F5F5DC", "accent": "#FFD700"}', 'Colores del sitio'),
('site_images', '{"logo": "", "banner": "", "footer_logo": ""}', 'Imágenes del sitio'),
('social_media', '{"whatsapp": "", "instagram": "", "facebook": "", "telegram": "", "tiktok": ""}', 'Redes sociales'),
('contact_info', '{"phone": "", "email": "", "address": ""}', 'Información de contacto'),
('raffle_limits', '{"max_active": 1, "max_finished_display": 10}', 'Límites de rifas'),
('payment_info', '{"default_methods": ["zinli", "zelle", "bs"]}', 'Información de pagos');

-- Datos de ejemplo para desarrollo
-- Rifa de ejemplo
INSERT INTO raffles (name, description, total_tickets, price_bs, price_usd, min_purchase, max_purchase, draw_date, status) VALUES
('Combo Power 2024', 'Gana un increíble automóvil en nuestro sorteo especial', 1000, 150.00, 1.00, 1, 10, '2024-12-31 20:00:00', 'active');

-- Premios de ejemplo
INSERT INTO prizes (raffle_id, name, description, position) VALUES
(1, 'Primer Premio - Automóvil', 'Chevrolet Spark modelo 2024', 1),
(1, 'Segundo Premio - Efectivo', '$500 dólares en efectivo', 2);

-- Métodos de pago de ejemplo
INSERT INTO payment_methods (raffle_id, method_type, account_info) VALUES
(1, 'zinli', '{"account": "04125051356", "holder": "Cindy Vanessa Ortiz"}'),
(1, 'zelle', '{"email": "cindy@email.com", "holder": "Cindy Vanessa Ortiz"}'),
(1, 'bs', '{"account": "01020123456789012345", "bank": "Banco de Venezuela", "holder": "Cindy Vanessa Ortiz"}');

-- Crear todos los boletos para la rifa de ejemplo
INSERT INTO tickets (raffle_id, ticket_number, status)
SELECT 1, number, 'available'
FROM (
    SELECT @row := @row + 1 as number
    FROM (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t1,
         (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t2,
         (SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t3,
         (SELECT @row := 0) r
    LIMIT 1000
) numbers;

-- Actualizar configuración existente con nuevos campos
UPDATE site_config SET config_value = '{"pago_movil_number": "", "bank_name": "", "cedula": "", "holder_name": "", "default_methods": ["pago_movil", "zinli", "zelle", "bs"]}' WHERE config_key = 'payment_info';

-- Agregar 'pago_movil' al ENUM de method_type en payment_methods
ALTER TABLE payment_methods 
MODIFY COLUMN method_type ENUM(
    'pago_movil', 
    'zinli', 
    'zelle', 
    'binance', 
    'bs', 
    'usd'
) NOT NULL;

-- También actualizar el ENUM en la tabla purchases para mantener consistencia
ALTER TABLE purchases 
MODIFY COLUMN payment_method ENUM(
    'pago_movil',
    'zinli', 
    'zelle', 
    'binance', 
    'bs', 
    'usd'
) NOT NULL;

-- Agregar la nueva configuración para el hero section
INSERT INTO site_config (config_key, config_value, description) VALUES
('hero_config', '{"main_text": "¡GANA", "accent_text": "AHORA!", "particles_type": "sparkles", "particles_count": 20}', 'Configuración del hero section');

-- Si ya existe, actualizarla
UPDATE site_config 
SET config_value = '{"main_text": "¡GANA", "accent_text": "AHORA!", "particles_type": "sparkles", "particles_count": 20}', 
    description = 'Configuración del hero section'
WHERE config_key = 'hero_config';



-- Actualizar la configuración del hero para incluir colores del texto
UPDATE site_config 
SET config_value = '{"main_text": "¡GANA", "accent_text": "AHORA!", "main_text_color": "#FFFFFF", "accent_text_color": "#FFD700", "particles_type": "sparkles", "particles_count": 20}', 
    description = 'Configuración del hero section con colores personalizables'
WHERE config_key = 'hero_config';

-- Si no existe la configuración del hero, insertarla
INSERT IGNORE INTO site_config (config_key, config_value, description) VALUES
('hero_config', '{"main_text": "¡GANA", "accent_text": "AHORA!", "main_text_color": "#FFFFFF", "accent_text_color": "#FFD700", "particles_type": "sparkles", "particles_count": 20}', 'Configuración del hero section con colores personalizables');

-- inserta si no existe o actualiza si existe
INSERT INTO site_config (config_key, config_value, description) VALUES
('site_info', '{"site_name": "", "tagline": ""}', 'Información general del sitio y rifas')
ON DUPLICATE KEY UPDATE 
config_value = '{"site_name": "", "tagline": ""}',
description = 'Información general del sitio y rifas';


-- tabla para logs de emails enviados
CREATE TABLE email_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_id INT,
    recipient_email VARCHAR(255) NOT NULL,
    email_type ENUM('purchase_confirmation', 'status_update', 'ticket_modification') NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
    resend_email_id VARCHAR(100),
    error_message TEXT,
    metadata JSON,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
    INDEX idx_purchase_id (purchase_id),
    INDEX idx_recipient_email (recipient_email),
    INDEX idx_email_type (email_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- configuración para emails en site_config
INSERT INTO site_config (config_key, config_value, description) VALUES
('email_settings', '{"enabled": true, "from_name": "Rifa", "from_email": "onboarding@resend.dev", "reply_to": "rifas@example.com", "send_confirmation": true, "send_status_updates": true, "send_modifications": true}', 'Configuración de emails automáticos')
ON DUPLICATE KEY UPDATE 
config_value = '{"enabled": true, "from_name": "Rifas Premium", "from_email": "onboarding@resend.dev", "reply_to": "rifas@example.com", "send_confirmation": true, "send_status_updates": true, "send_modifications": true}',
description = 'Configuración de emails automáticos';





-- Agregar estado 'paused' al ENUM de status en raffles
ALTER TABLE raffles 
MODIFY COLUMN status ENUM('draft', 'active', 'paused', 'finished', 'cancelled') DEFAULT 'draft';

-- Agregar campo para manejar la pausa automática
ALTER TABLE raffles 
ADD COLUMN pause_until TIMESTAMP NULL AFTER status,
ADD COLUMN pause_reason ENUM('manual', 'auto_full', 'auto_timeout') NULL AFTER pause_until,
ADD COLUMN auto_pause_enabled BOOLEAN DEFAULT TRUE AFTER pause_reason;

-- Índice para optimización de consultas de rifas en pausa
CREATE INDEX idx_raffles_pause_until ON raffles(pause_until);
CREATE INDEX idx_raffles_status_pause ON raffles(status, pause_until);

-- Agregar campo para publicar rifas
-- Esto permite que las rifas se publiquen en la página principal
ALTER TABLE raffles 
ADD publish BOOL DEFAULT false NOT NULL;
