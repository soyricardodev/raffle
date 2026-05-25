const { Resend } = require("resend");
const db = require("../config/database");

// API key
const resend = new Resend(
  process.env.RESEND_API_KEY || "re_3cMtTZPv_JmNGM4nv8bAhrcAxmumK1B2C"
);

// obtener la configuración del sitio
const getSiteConfig = async () => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM site_config ORDER BY config_key"
    );

    const config = {};
    rows.forEach((row) => {
      try {
        config[row.config_key] =
          typeof row.config_value === "string"
            ? JSON.parse(row.config_value)
            : row.config_value;
      } catch (e) {
        config[row.config_key] = row.config_value;
      }
    });

    return config;
  } catch (error) {
    console.error("Error obteniendo configuración del sitio:", error);
    //  por defecto si falla
    return {
      site_colors: {
        primary: "#8B7355",
        secondary: "#F5F5DC",
        accent: "#FFD700",
      },
      site_info: {
        site_name: "Rifas Premium",
        tagline: "Tu oportunidad de ganar",
      },
      contact_info: { phone: "", email: "rifas@example.com", address: "" },
      site_images: { logo: "", banner: "", footer_logo: "" },
      email_settings: {
        enabled: true,
        from_name: "Rifas Premium",
        from_email: "onboarding@resend.dev",
        reply_to: "rifas@example.com",
        send_confirmation: true,
        send_status_updates: true,
        send_modifications: true,
      },
    };
  }
};

// logear emails
const logEmail = async (data) => {
  try {
    const [result] = await db.execute(
      `INSERT INTO email_logs (
        purchase_id, recipient_email, email_type, subject, status, 
        resend_email_id, error_message, metadata, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.purchase_id || null,
        data.recipient_email,
        data.email_type,
        data.subject,
        data.status,
        data.resend_email_id || null,
        data.error_message || null,
        JSON.stringify(data.metadata || {}),
        data.status === "sent" ? new Date() : null,
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error("❌ Error guardando log de email:", error);
    return null;
  }
};

//actualizar log de email
const updateEmailLog = async (logId, updateData) => {
  try {
    await db.execute(
      `UPDATE email_logs SET 
        status = ?, resend_email_id = ?, error_message = ?, 
        sent_at = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        updateData.status,
        updateData.resend_email_id || null,
        updateData.error_message || null,
        updateData.status === "sent" ? new Date() : null,
        logId,
      ]
    );
  } catch (error) {
    console.error("❌ Error actualizando log de email:", error);
  }
};

//  HTML para compra realizada
const getPurchaseConfirmationTemplate = (
  purchaseData,
  config,
  ticketNumbers
) => {
  const colors = config.site_colors || {
    primary: "#8B7355",
    secondary: "#F5F5DC",
    accent: "#FFD700",
  };
  const siteInfo = config.site_info || {
    site_name: "Rifas Premium",
    tagline: "Tu oportunidad de ganar",
  };
  const contactInfo = config.contact_info || {
    phone: "",
    email: "rifas@example.com",
  };
  const baseUrl = process.env.BASE_URL || "http://localhost:5001";

  // Formatear números de tickets
  const formattedTickets = Array.isArray(ticketNumbers)
    ? ticketNumbers.map((num) => `#${String(num).padStart(4, "0")}`).join(", ")
    : ticketNumbers || "N/A";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Compra - ${siteInfo.site_name}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, ${colors.secondary} 0%, #f8f9fa 100%);
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
          position: relative;
        }
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" patternUnits="userSpaceOnUse" width="10" height="10"><circle cx="5" cy="5" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
        }
        .header-content {
          position: relative;
          z-index: 1;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .tagline {
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 30px 20px;
        }
        .status-badge {
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: white;
          padding: 15px 25px;
          border-radius: 25px;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
          margin: 20px 0;
          box-shadow: 0 5px 15px rgba(245, 158, 11, 0.3);
        }
        .info-section {
          background: ${colors.secondary};
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border-left: 5px solid ${colors.primary};
        }
        .info-title {
          color: ${colors.primary};
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #555;
        }
        .info-value {
          color: #333;
          font-weight: bold;
        }
        .tickets-section {
          background: linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%);
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
          border: 2px solid ${colors.accent};
        }
        .tickets-title {
          color: ${colors.primary};
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .ticket-numbers {
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          color: ${colors.primary};
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 2px dashed ${colors.accent};
          margin: 15px 0;
        }
        .instructions {
          background: #e3f2fd;
          border: 1px solid #2196f3;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .instructions-title {
          color: #1976d2;
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .instructions li {
          margin: 5px 0;
          color: #333;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .contact-info {
          margin-top: 15px;
        }
        .contact-item {
          margin: 5px 0;
        }
        .celebration {
          text-align: center;
          font-size: 48px;
          margin: 20px 0;
        }
        .verification-link {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          display: inline-block;
          margin: 15px 0;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 10px;
          }
          .header {
            padding: 20px 15px;
          }
          .content {
            padding: 20px 15px;
          }
          .info-row {
            flex-direction: column;
            gap: 5px;
          }
          .ticket-numbers {
            font-size: 18px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            <div class="logo">${siteInfo.site_name || "Rifas Premium"}</div>
            <div class="tagline">${siteInfo.tagline || "Tu oportunidad de ganar"}</div>
          </div>
        </div>
        
        <div class="content">
          <div class="celebration">🎉</div>
          <h1 style="color: ${colors.primary}; text-align: center; margin-bottom: 10px;">
            ¡Compra Registrada Exitosamente!
          </h1>
          <p style="text-align: center; color: #666; font-size: 16px;">
            Tu participación en la rifa ha sido registrada. A continuación los detalles:
          </p>
          
          <div class="status-badge">
            ⏳ Estado: PENDIENTE DE APROBACIÓN
          </div>
          
          <div class="info-section">
            <div class="info-title">
              👤 Información Personal
            </div>
            <div class="info-row">
              <span class="info-label">Nombre:</span>
              <span class="info-value">${purchaseData.customer_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span class="info-value">${purchaseData.customer_phone}</span>
            </div>
            ${purchaseData.customer_email
      ? `
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${purchaseData.customer_email}</span>
            </div>
            `
      : ""
    }
            ${purchaseData.customer_ci
      ? `
            <div class="info-row">
              <span class="info-label">Cédula:</span>
              <span class="info-value">${purchaseData.customer_ci}</span>
            </div>
            `
      : ""
    }
          </div>
          
          <div class="info-section">
            <div class="info-title">
              🎲 Detalles de la Rifa
            </div>
            <div class="info-row">
              <span class="info-label">Rifa:</span>
              <span class="info-value">${purchaseData.raffle_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cantidad de Boletos:</span>
              <span class="info-value">${purchaseData.ticket_quantity}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Método de Pago:</span>
              <span class="info-value">${purchaseData.payment_method?.toUpperCase()}</span>
            </div>
            ${purchaseData.payment_reference
      ? `
            <div class="info-row">
              <span class="info-label">Referencia:</span>
              <span class="info-value">${purchaseData.payment_reference}</span>
            </div>
            `
      : ""
    }
            <div class="info-row">
              <span class="info-label">Monto Total:</span>
              <span class="info-value" style="color: ${colors.primary}; font-size: 18px;">
                ${new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      minimumFractionDigits: 2,
    }).format(purchaseData.total_amount || 0)} Bs
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">ID de Compra:</span>
              <span class="info-value">#${purchaseData.purchase_id}</span>
            </div>
          </div>
          
          <div class="tickets-section">
            <div class="tickets-title">🎫 Tus Números Ganadores</div>
            <div class="ticket-numbers">
              ${formattedTickets}
            </div>
            <p style="color: #666; margin: 10px 0;">
              ¡Guarda estos números! Son tu boleto a la suerte.
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${baseUrl}/verificar?phone=${encodeURIComponent(purchaseData.customer_phone)}" 
                 class="verification-link">
                🔍 Verificar Mis Boletos Online
              </a>
            </div>
          </div>
          
          <div class="instructions">
            <div class="instructions-title">📋 Próximos Pasos:</div>
            <ul>
              <li><strong>Revisión:</strong> Nuestro equipo verificará tu comprobante de pago</li>
              <li><strong>Aprobación:</strong> Recibirás un email cuando tu compra sea aprobada</li>
              <li><strong>Confirmación:</strong> Tus boletos quedarán oficialmente registrados</li>
              <li><strong>Sorteo:</strong> Participa automáticamente en el sorteo programado</li>
            </ul>
            <p style="margin-top: 15px;">
              <strong>💡 Importante:</strong> Puedes verificar tus boletos en cualquier momento 
              usando tu número de teléfono en nuestro verificador de boletos.
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>¡Gracias por participar!</strong></p>
          <p>Que la suerte esté de tu lado 🍀</p>
          
          <div class="contact-info">
            <div class="contact-item">
              <strong>${siteInfo.site_name || "Rifas Premium"}</strong>
            </div>
            ${contactInfo.phone
      ? `
            <div class="contact-item">📱 ${contactInfo.phone}</div>
            `
      : ""
    }
            ${contactInfo.email
      ? `
            <div class="contact-item">📧 ${contactInfo.email}</div>
            `
      : ""
    }
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Este email fue enviado automáticamente. Por favor no respondas a este mensaje.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

//  HTML para compras con tickets reasignados
const getPurchaseReassignTemplate = (purchaseData, config, ticketsReassign) => {
  const colors = config.site_colors || {
    primary: "#8B7355",
    secondary: "#F5F5DC",
    accent: "#FFD700",
  };
  const siteInfo = config.site_info || {
    site_name: "Rifas Premium",
    tagline: "Tu oportunidad de ganar",
  };
  const contactInfo = config.contact_info || {
    phone: "",
    email: "rifas@example.com",
  };
  const baseUrl = process.env.BASE_URL || "http://localhost:5001";

  // Formatear números de tickets
  let ticketNumbers = ticketsReassign.ticket_numbers;
  const formattedTickets = Array.isArray(ticketNumbers)
    ? ticketNumbers.map((num) => `#${String(num).padStart(4, "0")}`).join(", ")
    : ticketNumbers || "N/A";

  let steps = "";
  let ticketsQuantity = "";

  console.log(purchaseData, "purchaseData");
  console.log(ticketsReassign, "ticketsReassign");

  // type: "add",
  // quantity: quantityInt,
  // ticket_numbers: selectedTicketNumbers,
  // all_ticket_numbers: allTicketNumbers,
  // previous_quantity: parseInt(purchase.ticket_quantity),
  // new_quantity: newTicketQuantity,
  // amount_change: additionalAmount,
  // new_total_amount: newTotalAmount,

  if (ticketsReassign.quantity > ticketsReassign.new_quantity) {
    const quantity_difference =
      ticketsReassign.quantity - ticketsReassign.new_quantity;
    steps = `<div class="instructions">
            <div class="instructions-title">📋 Próximos Pasos:</div>
            <ul>
              <li><strong>Devolución:</strong> Comunicate con nuestro equipo para procesar la devolución del pago de ${quantity_difference} boletos </li>
              <li><strong>Revisión:</strong> Nuestro equipo verificará tu comprobante de pago</li>
              <li><strong>Aprobación:</strong> Recibirás un email cuando tu compra sea aprobada</li>
              <li><strong>Confirmación:</strong> Tus boletos quedarán oficialmente registrados</li>
              <li><strong>Sorteo:</strong> Participa automáticamente en el sorteo programado</li>
            </ul>
            <p style="margin-top: 15px;">
              <strong>💡 Importante:</strong> Puedes verificar tus boletos en cualquier momento 
              usando tu número de teléfono en nuestro verificador de boletos.
            </p>
          </div>
          `;

    ticketsQuantity = `
            <div class="info-row">
              <span class="info-label">Cantidad de Boletos solicitada:</span>
              <span class="info-value">${purchaseData.ticket_quantity}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cantidad de Boletos asignada:</span>
              <span class="info-value">${ticketsReassign.new_quantity}</span>
            </div>
          `;
  } else {
    steps = `
      <div class="instructions">
        <div class="instructions-title">📋 Próximos Pasos:</div>
        <ul>
          <li><strong>Revisión:</strong> Nuestro equipo verificará tu comprobante de pago</li>
          <li><strong>Aprobación:</strong> Recibirás un email cuando tu compra sea aprobada</li>
          <li><strong>Confirmación:</strong> Tus boletos quedarán oficialmente registrados</li>
          <li><strong>Sorteo:</strong> Participa automáticamente en el sorteo programado</li>
        </ul>
        <p style="margin-top: 15px;">
          <strong>💡 Importante:</strong> Puedes verificar tus boletos en cualquier momento 
          usando tu número de teléfono en nuestro verificador de boletos.
        </p>
      </div>
    </div>
    `;

    ticketsQuantity = `
      <div class="info-row">
        <span class="info-label">Cantidad de Boletos:</span>
        <span class="info-value">${purchaseData.ticket_quantity}</span>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reasignación de Boletos - ${siteInfo.site_name}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, ${colors.secondary} 0%, #f8f9fa 100%);
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
          position: relative;
        }
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" patternUnits="userSpaceOnUse" width="10" height="10"><circle cx="5" cy="5" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
        }
        .header-content {
          position: relative;
          z-index: 1;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .tagline {
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 30px 20px;
        }
        .status-badge {
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: white;
          padding: 15px 25px;
          border-radius: 25px;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
          margin: 20px 0;
          box-shadow: 0 5px 15px rgba(245, 158, 11, 0.3);
        }
        .info-section {
          background: ${colors.secondary};
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border-left: 5px solid ${colors.primary};
        }
        .info-title {
          color: ${colors.primary};
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #555;
        }
        .info-value {
          color: #333;
          font-weight: bold;
        }
        .tickets-section {
          background: linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%);
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
          border: 2px solid ${colors.accent};
        }
        .tickets-title {
          color: ${colors.primary};
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .ticket-numbers {
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          color: ${colors.primary};
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 2px dashed ${colors.accent};
          margin: 15px 0;
        }
        .instructions {
          background: #e3f2fd;
          border: 1px solid #2196f3;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .instructions-title {
          color: #1976d2;
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .instructions li {
          margin: 5px 0;
          color: #333;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .contact-info {
          margin-top: 15px;
        }
        .contact-item {
          margin: 5px 0;
        }
        .celebration {
          text-align: center;
          font-size: 48px;
          margin: 20px 0;
        }
        .verification-link {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          display: inline-block;
          margin: 15px 0;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 10px;
          }
          .header {
            padding: 20px 15px;
          }
          .content {
            padding: 20px 15px;
          }
          .info-row {
            flex-direction: column;
            gap: 5px;
          }
          .ticket-numbers {
            font-size: 18px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            <div class="logo">${siteInfo.site_name || "Rifas Premium"}</div>
            <div class="tagline">${siteInfo.tagline || "Tu oportunidad de ganar"}</div>
          </div>
        </div>
        
        <div class="content">
          <div class="celebration">🎉</div>
          <h1 style="color: ${colors.primary}; text-align: center; margin-bottom: 10px;">
            ¡Boletos Reasignados Exitosamente!
          </h1>
          <p style="text-align: center; color: #666; font-size: 16px;">
            Tu participación en la rifa ha sido modificada. A continuación los detalles:
          </p>
          
          <div class="status-badge">
            ⏳ Estado: PENDIENTE DE APROBACIÓN
          </div>
          
          <div class="info-section">
            <div class="info-title">
              👤 Información Personal
            </div>
            <div class="info-row">
              <span class="info-label">Nombre:</span>
              <span class="info-value">${purchaseData.customer_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span class="info-value">${purchaseData.customer_phone}</span>
            </div>
            ${purchaseData.customer_email
      ? `
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${purchaseData.customer_email}</span>
            </div>
            `
      : ""
    }
            ${purchaseData.customer_ci
      ? `
            <div class="info-row">
              <span class="info-label">Cédula:</span>
              <span class="info-value">${purchaseData.customer_ci}</span>
            </div>
            `
      : ""
    }
          </div>
          
          <div class="info-section">
            <div class="info-title">
              🎲 Detalles de la Rifa
            </div>
            <div class="info-row">
              <span class="info-label">Rifa:</span>
              <span class="info-value">${purchaseData.raffle_name}</span>
            </div>
            ${ticketsQuantity}
            <div class="info-row">
              <span class="info-label">Método de Pago:</span>
              <span class="info-value">${purchaseData.payment_method?.toUpperCase()}</span>
            </div>
            ${purchaseData.payment_reference
      ? `
            <div class="info-row">
              <span class="info-label">Referencia:</span>
              <span class="info-value">${purchaseData.payment_reference}</span>
            </div>
            `
      : ""
    }
            <div class="info-row">
              <span class="info-label">Monto Total:</span>
              <span class="info-value" style="color: ${colors.primary}; font-size: 18px;">
                ${new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      minimumFractionDigits: 2,
    }).format(purchaseData.total_amount || 0)} Bs
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">ID de Compra:</span>
              <span class="info-value">#${purchaseData.purchase_id}</span>
            </div>
          </div>
          
          <div class="tickets-section">
            <div class="tickets-title">🎫 Tus Números Ganadores</div>
            <div class="ticket-numbers">
              ${formattedTickets}
            </div>
            <p style="color: #666; margin: 10px 0;">
              ¡Guarda estos números! Son tu boleto a la suerte.
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${baseUrl}/verificar?phone=${encodeURIComponent(purchaseData.customer_phone)}" 
                 class="verification-link">
                🔍 Verificar Mis Boletos Online
              </a>
            </div>
          </div>

          ${steps}
        
        <div class="footer">
          <p><strong>¡Gracias por participar!</strong></p>
          <p>Que la suerte esté de tu lado 🍀</p>
          
          <div class="contact-info">
            <div class="contact-item">
              <strong>${siteInfo.site_name || "Rifas Premium"}</strong>
            </div>
            ${contactInfo.phone
      ? `
            <div class="contact-item">📱 ${contactInfo.phone}</div>
            `
      : ""
    }
            ${contactInfo.email
      ? `
            <div class="contact-item">📧 ${contactInfo.email}</div>
            `
      : ""
    }
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Este email fue enviado automáticamente. Por favor no respondas a este mensaje.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template para actualización de estado (manteniendo el anterior)
const getStatusUpdateTemplate = (
  purchaseData,
  config,
  newStatus,
  ticketNumbers
) => {
  const colors = config.site_colors || {
    primary: "#8B7355",
    secondary: "#F5F5DC",
    accent: "#FFD700",
  };
  const siteInfo = config.site_info || {
    site_name: "Rifas Premium",
    tagline: "Tu oportunidad de ganar",
  };
  const contactInfo = config.contact_info || {
    phone: "",
    email: "rifas@example.com",
  };
  const baseUrl = process.env.BASE_URL || "http://localhost:5001";

  // Configurar contenido según el estado
  let statusInfo = {};
  if (newStatus === "approved") {
    statusInfo = {
      emoji: "✅",
      title: "¡Compra Aprobada!",
      subtitle: "Tu participación ha sido confirmada",
      color: "#22c55e",
      gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
      message:
        "Tu compra ha sido aprobada exitosamente. Tus boletos están oficialmente registrados para el sorteo.",
      instructions: [
        "Tus boletos están confirmados y registrados",
        "Participarás automáticamente en el sorteo",
        "Te notificaremos el resultado del sorteo",
        "Guarda este email como comprobante",
      ],
    };
  } else if (newStatus === "rejected") {
    statusInfo = {
      emoji: "❌",
      title: "Compra Rechazada",
      subtitle: "Hubo un problema con tu compra",
      color: "#ef4444",
      gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      message:
        "Tu compra no pudo ser aprobada. Esto puede deberse a problemas con el comprobante de pago o información incorrecta.",
      instructions: [
        "Verifica que el comprobante de pago sea correcto",
        "Asegúrate de que los datos coincidan",
        "Contacta a nuestro equipo para más información",
        "Puedes realizar una nueva compra cuando esté todo correcto",
      ],
    };
  }

  // Formatear números de tickets
  const formattedTickets = Array.isArray(ticketNumbers)
    ? ticketNumbers.map((num) => `#${String(num).padStart(4, "0")}`).join(", ")
    : ticketNumbers || "N/A";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Actualización de Estado - ${siteInfo.site_name}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, ${colors.secondary} 0%, #f8f9fa 100%);
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header {
          background: ${statusInfo.gradient};
          color: white;
          padding: 30px 20px;
          text-align: center;
          position: relative;
        }
        .status-icon {
          font-size: 64px;
          margin-bottom: 15px;
        }
        .status-title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .status-subtitle {
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 30px 20px;
        }
        .info-section {
          background: ${colors.secondary};
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border-left: 5px solid ${colors.primary};
        }
        .info-title {
          color: ${colors.primary};
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #555;
        }
        .info-value {
          color: #333;
          font-weight: bold;
        }
        .message-box {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          color: #333;
          font-size: 16px;
          line-height: 1.5;
        }
        .instructions {
          background: ${newStatus === "approved" ? "#e8f5e8" : "#ffeaea"};
          border: 1px solid ${newStatus === "approved" ? "#22c55e" : "#ef4444"};
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .instructions-title {
          color: ${newStatus === "approved" ? "#16a34a" : "#dc2626"};
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .instructions li {
          margin: 8px 0;
          color: #333;
        }
        .tickets-section {
          background: linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%);
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
          border: 2px solid ${colors.accent};
        }
        .tickets-title {
          color: ${colors.primary};
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .ticket-numbers {
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          color: ${colors.primary};
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 2px dashed ${colors.accent};
          margin: 15px 0;
        }
        .verification-link {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          display: inline-block;
          margin: 15px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .contact-info {
          margin-top: 15px;
        }
        .contact-item {
          margin: 5px 0;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 10px;
          }
          .header {
            padding: 20px 15px;
          }
          .content {
            padding: 20px 15px;
          }
          .info-row {
            flex-direction: column;
            gap: 5px;
          }
          .ticket-numbers {
            font-size: 18px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="status-icon">${statusInfo.emoji}</div>
          <div class="status-title">${statusInfo.title}</div>
          <div class="status-subtitle">${statusInfo.subtitle}</div>
        </div>
        
        <div class="content">
          <h2 style="color: ${colors.primary}; text-align: center;">
            Hola ${purchaseData.customer_name}
          </h2>
          
          <div class="message-box">
            ${statusInfo.message}
          </div>
          
          <div class="info-section">
            <div class="info-title">
              📋 Detalles de la Compra
            </div>
            <div class="info-row">
              <span class="info-label">ID de Compra:</span>
              <span class="info-value">#${purchaseData.purchase_id || purchaseData.id}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Rifa:</span>
              <span class="info-value">${purchaseData.raffle_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cantidad de Boletos:</span>
              <span class="info-value">${purchaseData.ticket_quantity}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Monto Total:</span>
              <span class="info-value" style="color: ${colors.primary};">
                ${new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
  }).format(purchaseData.total_amount || 0)} Bs
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Nuevo Estado:</span>
              <span class="info-value" style="color: ${statusInfo.color}; text-transform: uppercase;">
                ${newStatus === "approved" ? "APROBADO" : "RECHAZADO"}
              </span>
            </div>
          </div>
          
          ${newStatus === "approved" && ticketNumbers
      ? `
          <div class="tickets-section">
            <div class="tickets-title">🎫 Tus Números Confirmados</div>
            <div class="ticket-numbers">
              ${formattedTickets}
            </div>
            <p style="color: #666; margin: 10px 0;">
              ¡Estos números están oficialmente registrados para el sorteo!
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${baseUrl}/verificar?phone=${encodeURIComponent(purchaseData.customer_phone)}" 
                 class="verification-link">
                🔍 Verificar Mis Boletos Online
              </a>
            </div>
          </div>
          `
      : ""
    }
          
          <div class="instructions">
            <div class="instructions-title">
              ${newStatus === "approved" ? "🎉 ¡Felicitaciones!" : "📞 Qué hacer ahora:"}
            </div>
            <ul>
              ${statusInfo.instructions.map((instruction) => `<li>${instruction}</li>`).join("")}
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${siteInfo.site_name || "Rifas Premium"}</strong></p>
          
          <div class="contact-info">
            ${contactInfo.phone
      ? `
            <div class="contact-item">📱 ${contactInfo.phone}</div>
            `
      : ""
    }
            ${contactInfo.email
      ? `
            <div class="contact-item">📧 ${contactInfo.email}</div>
            `
      : ""
    }
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Este email fue enviado automáticamente. Por favor no respondas a este mensaje.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Template para modificación de boletos
const getTicketModificationTemplate = (purchaseData, config, modification) => {
  const colors = config.site_colors || {
    primary: "#8B7355",
    secondary: "#F5F5DC",
    accent: "#FFD700",
  };
  const siteInfo = config.site_info || {
    site_name: "Rifas Premium",
    tagline: "Tu oportunidad de ganar",
  };
  const contactInfo = config.contact_info || {
    phone: "",
    email: "rifas@example.com",
  };
  const baseUrl = process.env.BASE_URL || "http://localhost:5001";

  const isAddition = modification.type === "add";
  const emoji = isAddition ? "➕" : "➖";
  const action = isAddition ? "agregados" : "removidos";
  const title = isAddition ? "Boletos Agregados" : "Boletos Removidos";
  const colorScheme = isAddition ? "#22c55e" : "#f59e0b";

  // Formatear números de tickets
  const formattedModifiedTickets = Array.isArray(modification.ticket_numbers)
    ? modification.ticket_numbers
      .map((num) => `#${String(num).padStart(4, "0")}`)
      .join(", ")
    : modification.ticket_numbers || "N/A";

  const formattedAllTickets = Array.isArray(modification.all_ticket_numbers)
    ? modification.all_ticket_numbers
      .map((num) => `#${String(num).padStart(4, "0")}`)
      .join(", ")
    : modification.all_ticket_numbers || "N/A";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Modificación de Boletos - ${siteInfo.site_name}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, ${colors.secondary} 0%, #f8f9fa 100%);
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${colorScheme} 0%, ${colors.primary} 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header-icon {
          font-size: 64px;
          margin-bottom: 15px;
        }
        .header-title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .header-subtitle {
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 30px 20px;
        }
        .modification-highlight {
          background: linear-gradient(135deg, ${colorScheme}15 0%, ${colors.accent}15 100%);
          border: 2px solid ${colorScheme};
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
        }
        .modification-title {
          color: ${colorScheme};
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .modified-tickets {
          font-family: 'Courier New', monospace;
          font-size: 20px;
          font-weight: bold;
          color: ${colorScheme};
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 2px dashed ${colorScheme};
          margin: 15px 0;
        }
        .info-section {
          background: ${colors.secondary};
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border-left: 5px solid ${colors.primary};
        }
        .info-title {
          color: ${colors.primary};
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #555;
        }
        .info-value {
          color: #333;
          font-weight: bold;
        }
        .tickets-section {
          background: linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%);
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
          border: 2px solid ${colors.accent};
        }
        .tickets-title {
          color: ${colors.primary};
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .all-tickets {
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: bold;
          color: ${colors.primary};
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 2px dashed ${colors.accent};
          margin: 15px 0;
          word-wrap: break-word;
        }
        .verification-link {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          display: inline-block;
          margin: 15px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .contact-info {
          margin-top: 15px;
        }
        .contact-item {
          margin: 5px 0;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 10px;
          }
          .header {
            padding: 20px 15px;
          }
          .content {
            padding: 20px 15px;
          }
          .info-row {
            flex-direction: column;
            gap: 5px;
          }
          .modified-tickets, .all-tickets {
            font-size: 16px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-icon">${emoji}</div>
          <div class="header-title">${title}</div>
          <div class="header-subtitle">Tu compra ha sido actualizada</div>
        </div>
        
        <div class="content">
          <h2 style="color: ${colors.primary}; text-align: center;">
            Hola ${purchaseData.customer_name}
          </h2>
          
          <p style="text-align: center; color: #666; font-size: 16px;">
            Hemos ${action} boletos a tu compra según tu solicitud.
          </p>
          
          <div class="modification-highlight">
            <div class="modification-title">
              ${emoji} Boletos ${action.charAt(0).toUpperCase() + action.slice(1)}
            </div>
            <div class="modified-tickets">
              ${formattedModifiedTickets}
            </div>
            <p style="color: #666; margin: 10px 0;">
              ${modification.quantity} boleto${modification.quantity !== 1 ? "s" : ""} ${action}
            </p>
          </div>
          
          <div class="info-section">
            <div class="info-title">
              📋 Resumen Actualizado
            </div>
            <div class="info-row">
              <span class="info-label">ID de Compra:</span>
              <span class="info-value">#${purchaseData.purchase_id || purchaseData.id}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Rifa:</span>
              <span class="info-value">${purchaseData.raffle_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cantidad ${isAddition ? "Anterior" : "Anterior"}:</span>
              <span class="info-value">${modification.previous_quantity}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cantidad Actual:</span>
              <span class="info-value" style="color: ${colorScheme};">${modification.new_quantity}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Monto ${isAddition ? "Agregado" : "Deducido"}:</span>
              <span class="info-value" style="color: ${isAddition ? "#22c55e" : "#f59e0b"};">
                ${isAddition ? "+" : "-"}${new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
  }).format(modification.amount_change || 0)} Bs
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Monto Total:</span>
              <span class="info-value" style="color: ${colors.primary}; font-size: 18px;">
                ${new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
  }).format(modification.new_total_amount || 0)} Bs
              </span>
            </div>
          </div>
          
          <div class="tickets-section">
            <div class="tickets-title">🎫 Todos Tus Números Actuales</div>
            <div class="all-tickets">
              ${formattedAllTickets}
            </div>
            <p style="color: #666; margin: 10px 0;">
              Total: ${modification.new_quantity} boleto${modification.new_quantity !== 1 ? "s" : ""}
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${baseUrl}/verificar?phone=${encodeURIComponent(purchaseData.customer_phone)}" 
                 class="verification-link">
                🔍 Verificar Mis Boletos Online
              </a>
            </div>
          </div>
          
          <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="color: #1976d2; font-weight: bold; margin-bottom: 10px; font-size: 16px;">
              📝 Información Importante:
            </div>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Esta modificación se ha aplicado automáticamente</li>
              <li>El ${isAddition ? "monto adicional" : "reembolso"} será ${isAddition ? "facturado" : "procesado"} según corresponda</li>
              <li>Todos tus boletos siguen siendo válidos para el sorteo</li>
              <li>Guarda este email como comprobante actualizado</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${siteInfo.site_name || "Rifas Premium"}</strong></p>
          
          <div class="contact-info">
            ${contactInfo.phone
      ? `
            <div class="contact-item">📱 ${contactInfo.phone}</div>
            `
      : ""
    }
            ${contactInfo.email
      ? `
            <div class="contact-item">📧 ${contactInfo.email}</div>
            `
      : ""
    }
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Este email fue enviado automáticamente. Por favor no respondas a este mensaje.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

//  enviar email de confirmación de compra
const sendPurchaseConfirmationEmail = async (purchaseData, ticketNumbers) => {
  let logId = null;

  try {
    if (!purchaseData.customer_email || !purchaseData.customer_email.trim()) {
      console.log("⚠️ No hay email del cliente, omitiendo envío de email");
      return {
        success: true,
        message: "Email omitido - no hay dirección de correo",
      };
    }

    const config = await getSiteConfig();
    const emailSettings = config.email_settings || { enabled: true };

    if (!emailSettings.enabled || !emailSettings.send_confirmation) {
      return {
        success: true,
        message: "Email omitido - deshabilitado en configuración",
      };
    }

    const siteInfo = config.site_info || { site_name: "Rifas Premium" };
    const fromName =
      emailSettings.from_name || siteInfo.site_name || "Rifas Premium";
    const fromEmail = emailSettings.from_email || "onboarding@resend.dev";
    const subject = `🎉 Compra Confirmada - ${siteInfo.site_name || "Rifas Premium"}`;

    // Crear log inicial
    logId = await logEmail({
      purchase_id: purchaseData.purchase_id,
      recipient_email: purchaseData.customer_email.trim(),
      email_type: "purchase_confirmation",
      subject: subject,
      status: "pending",
      metadata: {
        ticket_quantity: purchaseData.ticket_quantity,
        ticket_numbers: ticketNumbers,
        total_amount: purchaseData.total_amount,
      },
    });

    const emailContent = getPurchaseConfirmationTemplate(
      purchaseData,
      config,
      ticketNumbers
    );

    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: [purchaseData.customer_email.trim()],
      subject: subject,
      html: emailContent,
      reply_to: emailSettings.reply_to || fromEmail,
    };

    console.log("📤 Enviando email a:", purchaseData.customer_email);

    //const { data, error } = await resend.emails.send(emailData);

    /*if (error) {
      console.error("❌ Error enviando email:", error);

      // Actualizar log con error
      if (logId) {
        await updateEmailLog(logId, {
          status: "failed",
          error_message: error.message,
        });
      }

      return { success: false, error: error.message };
    }*/

    console.log("✅ Email de confirmación enviado exitosamente:", data);

    // Actualizar log con éxito
    if (logId) {
      await updateEmailLog(logId, {
        status: "sent",
        resend_email_id: data.id,
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error("💥 Error enviando email de confirmación:", error);

    // Actualizar log con error
    if (logId) {
      await updateEmailLog(logId, {
        status: "failed",
        error_message: error.message,
      });
    }

    return { success: false, error: error.message };
  }
};

//  enviar email de reasignación de boletos
const sendPurchaseReassignEmail = async (purchaseData, ticketNumbers) => {
  let logId = null;

  try {
    if (!purchaseData.customer_email || !purchaseData.customer_email.trim()) {
      console.log("⚠️ No hay email del cliente, omitiendo envío de email");
      return {
        success: true,
        message: "Email omitido - no hay dirección de correo",
      };
    }

    const config = await getSiteConfig();
    const emailSettings = config.email_settings || { enabled: true };

    if (!emailSettings.enabled || !emailSettings.send_confirmation) {
      return {
        success: true,
        message: "Email omitido - deshabilitado en configuración",
      };
    }

    const siteInfo = config.site_info || { site_name: "Rifas Premium" };
    const fromName =
      emailSettings.from_name || siteInfo.site_name || "Rifas Premium";
    const fromEmail = emailSettings.from_email || "onboarding@resend.dev";
    const subject = `🎉 Reasignación de Boletos - ${siteInfo.site_name || "Rifas Premium"}`;

    // Crear log inicial
    logId = await logEmail({
      purchase_id: purchaseData.purchase_id,
      recipient_email: purchaseData.customer_email.trim(),
      email_type: "status_update",
      subject: subject,
      status: "pending",
      metadata: {
        ticket_quantity: purchaseData.ticket_quantity,
        ticket_numbers: ticketNumbers,
        total_amount: purchaseData.total_amount,
      },
    });

    const emailContent = getPurchaseReassignTemplate(
      purchaseData,
      config,
      ticketNumbers
    );

    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: [purchaseData.customer_email.trim()],
      subject: subject,
      html: emailContent,
      reply_to: emailSettings.reply_to || fromEmail,
    };

    console.log("📤 Enviando email a:", purchaseData.customer_email);

    //const { data, error } = await resend.emails.send(emailData);

    /*if (error) {
      console.error("❌ Error enviando email:", error);

      // Actualizar log con error
      if (logId) {
        await updateEmailLog(logId, {
          status: "failed",
          error_message: error.message,
        });
      }

      return { success: false, error: error.message };
    }*/

    console.log("✅ Email de reasignación enviado exitosamente:", data);

    // Actualizar log con éxito
    if (logId) {
      await updateEmailLog(logId, {
        status: "sent",
        resend_email_id: data.id,
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error("💥 Error enviando email de confirmación:", error);

    // Actualizar log con error
    if (logId) {
      await updateEmailLog(logId, {
        status: "failed",
        error_message: error.message,
      });
    }

    return { success: false, error: error.message };
  }
};

// enviar email de actualización de estado
const sendStatusUpdateEmail = async (
  purchaseData,
  newStatus,
  ticketNumbers
) => {
  let logId = null;

  try {
    if (!purchaseData.customer_email || !purchaseData.customer_email.trim()) {
      return {
        success: true,
        message: "Email omitido - no hay dirección de correo",
      };
    }

    const config = await getSiteConfig();
    const emailSettings = config.email_settings || { enabled: true };

    if (!emailSettings.enabled || !emailSettings.send_status_updates) {
      return {
        success: true,
        message: "Email omitido - deshabilitado en configuración",
      };
    }

    const siteInfo = config.site_info || { site_name: "Rifas Premium" };
    const fromName =
      emailSettings.from_name || siteInfo.site_name || "Rifas Premium";
    const fromEmail = emailSettings.from_email || "onboarding@resend.dev";

    const statusText = newStatus === "approved" ? "Aprobada" : "Rechazada";
    const emoji = newStatus === "approved" ? "✅" : "❌";
    const subject = `${emoji} Compra ${statusText} - ${siteInfo.site_name || "Rifas Premium"}`;

    // Crear log inicial
    logId = await logEmail({
      purchase_id: purchaseData.purchase_id || purchaseData.id,
      recipient_email: purchaseData.customer_email.trim(),
      email_type: "status_update",
      subject: subject,
      status: "pending",
      metadata: {
        new_status: newStatus,
        ticket_numbers: ticketNumbers,
      },
    });

    const emailContent = getStatusUpdateTemplate(
      purchaseData,
      config,
      newStatus,
      ticketNumbers
    );

    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: [purchaseData.customer_email.trim()],
      subject: subject,
      html: emailContent,
      reply_to: emailSettings.reply_to || fromEmail,
    };

    //const { data, error } = await resend.emails.send(emailData);

    /*if (error) {
      console.error("❌ Error enviando email de actualización:", error);

      // Actualizar log con error
      if (logId) {
        await updateEmailLog(logId, {
          status: "failed",
          error_message: error.message,
        });
      }

      return { success: false, error: error.message };
    }*/

    // Actualizar log con éxito
    if (logId) {
      await updateEmailLog(logId, {
        status: "sent",
        resend_email_id: data.id,
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error("💥 Error enviando email de actualización:", error);

    // Actualizar log con error
    if (logId) {
      await updateEmailLog(logId, {
        status: "failed",
        error_message: error.message,
      });
    }

    return { success: false, error: error.message };
  }
};

// enviar email de modificación de boletos
const sendTicketModificationEmail = async (purchaseData, modification) => {
  let logId = null;

  try {
    if (!purchaseData.customer_email || !purchaseData.customer_email.trim()) {
      return {
        success: true,
        message: "Email omitido - no hay dirección de correo",
      };
    }

    const config = await getSiteConfig();
    const emailSettings = config.email_settings || { enabled: true };

    if (!emailSettings.enabled || !emailSettings.send_modifications) {
      return {
        success: true,
        message: "Email omitido - deshabilitado en configuración",
      };
    }

    const siteInfo = config.site_info || { site_name: "Rifas Premium" };
    const fromName =
      emailSettings.from_name || siteInfo.site_name || "Rifas Premium";
    const fromEmail = emailSettings.from_email || "onboarding@resend.dev";

    const action = modification.type === "add" ? "Agregados" : "Removidos";
    const emoji = modification.type === "add" ? "➕" : "➖";
    const subject = `${emoji} Boletos ${action} - ${siteInfo.site_name || "Rifas Premium"}`;

    // Crear log inicial
    logId = await logEmail({
      purchase_id: purchaseData.purchase_id || purchaseData.id,
      recipient_email: purchaseData.customer_email.trim(),
      email_type: "ticket_modification",
      subject: subject,
      status: "pending",
      metadata: modification,
    });

    const emailContent = getTicketModificationTemplate(
      purchaseData,
      config,
      modification
    );

    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: [purchaseData.customer_email.trim()],
      subject: subject,
      html: emailContent,
      reply_to: emailSettings.reply_to || fromEmail,
    };

    console.log(
      "📤 Enviando email de modificación a:",
      purchaseData.customer_email
    );

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error("❌ Error enviando email de modificación:", error);

      // Actualizar log con error
      if (logId) {
        await updateEmailLog(logId, {
          status: "failed",
          error_message: error.message,
        });
      }

      return { success: false, error: error.message };
    }

    console.log("✅ Email de modificación enviado exitosamente:", data);

    // Actualizar log con éxito
    if (logId) {
      await updateEmailLog(logId, {
        status: "sent",
        resend_email_id: data.id,
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error("💥 Error enviando email de modificación:", error);

    // Actualizar log con error
    if (logId) {
      await updateEmailLog(logId, {
        status: "failed",
        error_message: error.message,
      });
    }

    return { success: false, error: error.message };
  }
};

// obtener logs de emails
const getEmailLogs = async (filters = {}) => {
  try {
    let query = `
      SELECT el.*, p.customer_name, p.customer_phone, r.name as raffle_name
      FROM email_logs el
      LEFT JOIN purchases p ON el.purchase_id = p.id
      LEFT JOIN raffles r ON p.raffle_id = r.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.purchase_id) {
      query += " AND el.purchase_id = ?";
      params.push(filters.purchase_id);
    }

    if (filters.email_type) {
      query += " AND el.email_type = ?";
      params.push(filters.email_type);
    }

    if (filters.status) {
      query += " AND el.status = ?";
      params.push(filters.status);
    }

    if (filters.recipient_email) {
      query += " AND el.recipient_email LIKE ?";
      params.push(`%${filters.recipient_email}%`);
    }

    query += " ORDER BY el.created_at DESC";

    if (filters.limit) {
      query += ` LIMIT ${parseInt(filters.limit)}`;
    }

    const [rows] = await db.execute(query, params);

    //   JSON
    const logsWithParsedMetadata = rows.map((log) => ({
      ...log,
      metadata:
        typeof log.metadata === "string"
          ? JSON.parse(log.metadata)
          : log.metadata,
    }));

    return logsWithParsedMetadata;
  } catch (error) {
    console.error("Error obteniendo logs de emails:", error);
    return [];
  }
};

module.exports = {
  sendPurchaseConfirmationEmail,
  sendPurchaseReassignEmail,
  sendStatusUpdateEmail,
  sendTicketModificationEmail,
  getSiteConfig,
  getEmailLogs,
  logEmail,
  updateEmailLog,
};
