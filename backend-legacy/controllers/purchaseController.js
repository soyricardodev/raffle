const db = require("../config/database");
const { validationResult } = require("express-validator");
const emailService = require("../services/emailService");
const pauseService = require("../services/pauseService");

const createPurchase = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await connection.rollback();
      console.error("❌ ========== ERROR DE VALIDACIÓN ==========");
      console.error("📅 Timestamp:", new Date().toISOString());
      console.error("❌ Errores de validación:", JSON.stringify(errors.array(), null, 2));
      console.error("📋 Datos recibidos:", {
        raffle_id: req.body?.raffle_id,
        customer_name: req.body?.customer_name ? '***' : undefined,
        customer_phone: req.body?.customer_phone ? '***' : undefined,
        payment_method: req.body?.payment_method,
        ticket_quantity: req.body?.ticket_quantity
      });
      console.error("🌐 IP del Cliente:", req.ip || req.connection?.remoteAddress);
      console.error("❌ ===========================================");
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      raffle_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_ci,
      payment_method,
      payment_reference,
      ticket_quantity,
      customer_location
    } = req.body;

    console.log("🛒 Procesando nueva compra:", {
      raffle_id,
      customer_name,
      customer_phone,
      payment_method,
      payment_reference,
      ticket_quantity,
      customer_location
    });

    // Verificar que la rifa existe y está activa
    const [raffleRows] = await connection.execute(
      "SELECT *, DATE_SUB(NOW(), INTERVAL 4 HOUR) as currentdate FROM raffles WHERE id = ?",
      [raffle_id]
    );

    if (raffleRows.length === 0) {
      await connection.rollback();
      console.error("❌ ========== RIFA NO ENCONTRADA ==========");
      console.error("📅 Timestamp:", new Date().toISOString());
      console.error("🔍 Rifa ID solicitada:", raffle_id);
      console.error("🌐 IP del Cliente:", req.ip || req.connection?.remoteAddress);
      console.error("📋 Datos del request:", {
        customer_name: req.body?.customer_name ? '***' : undefined,
        customer_phone: req.body?.customer_phone ? '***' : undefined,
        payment_method: req.body?.payment_method
      });
      console.error("❌ ===========================================");
      return res.status(404).json({ error: "Rifa no encontrada" });
    }

    const raffle = raffleRows[0];

    // si la rifa está finalizada
    if (raffle.status === "finished") {
      await connection.rollback();
      return res.status(400).json({
        error: "Esta rifa ya ha finalizado. No se pueden comprar más boletos.",
      });
    }

    // si la rifa está pausada
    if (raffle.status === "paused") {
      // Obtener información detallada de la pausa
      const pauseInfo = await pauseService.getPauseInfo(raffle_id);

      let errorMessage =
        "Esta rifa se encuentra en pausa temporalmente. Por favor intenta más tarde.";

      //  mensaje según el tipo de pausa
      if (pauseInfo?.pauseContext) {
        const context = pauseInfo.pauseContext;
        if (context.title === "Boletos Insuficientes") {
          errorMessage = `Esta rifa está pausada porque solo quedan ${pauseInfo.availability?.available || 0} boletos disponibles, pero necesitas al menos ${pauseInfo.minPurchase} boletos para comprar. La rifa se reactivará automáticamente en ${Math.ceil(pauseInfo.remainingSeconds / 60)} minutos o cuando se liberen más boletos.`;
        }
      }

      await connection.rollback();
      return res.status(400).json({
        error: errorMessage,
        isPaused: true,
        pauseInfo: pauseInfo,
      });
    }

    // si la rifa ha pasado su fecha de sorteo**
    if (
      raffle.draw_date &&
      new Date(raffle.draw_date) <= new Date(raffle.currentdate)
    ) {
      await connection.rollback();
      return res.status(400).json({
        error:
          "Esta rifa ya ha finalizado por fecha de sorteo. No se pueden comprar más boletos.",
      });
    }

    //  que la rifa está activa
    if (raffle.status !== "active") {
      await connection.rollback();
      console.error("❌ ========== RIFA NO ACTIVA ==========");
      console.error("📅 Timestamp:", new Date().toISOString());
      console.error("🔍 Rifa ID:", raffle_id);
      console.error("📊 Estado de la rifa:", raffle.status);
      console.error("🌐 IP del Cliente:", req.ip || req.connection?.remoteAddress);
      console.error("❌ ===========================================");
      return res.status(400).json({ error: "Rifa no activa" });
    }

    // disponibilidad de tickets ANTES de continuar
    const availability = await pauseService.checkTicketAvailability(raffle_id);

    console.log("📊 Disponibilidad de tickets:", availability);

    // compra mínima
    if (availability.available < raffle.min_purchase) {
      await connection.rollback();

      // Intentar pausar automáticamente por tickets insuficientes
      const pauseResult = await pauseService.pauseRaffle(
        raffle_id,
        "auto_insufficient"
      );

      if (pauseResult.success) {
        return res.status(400).json({
          error: `La rifa se encuentra en PAUSA porque solo hay ${availability.available} boletos disponibles, pero se necesitan al menos ${raffle.min_purchase} boletos para comprar. Vuelve a intentar en 15 minutos.`,
          isPaused: true,
          pauseInfo: {
            remainingSeconds: 15 * 60,
            pauseUntil: pauseResult.pauseUntil,
            reason: "auto_insufficient",
            minPurchase: raffle.min_purchase,
            available: availability.available,
          },
        });
      }

      return res.status(400).json({
        error: `Solo hay ${availability.available} boletos disponibles, pero necesitas al menos ${raffle.min_purchase} boletos para comprar.`,
        availableTickets: availability.available,
        minPurchase: raffle.min_purchase,
      });
    }

    // Verificar si hay suficientes tickets disponibles para la compra
    if (availability.available < ticket_quantity) {
      await connection.rollback();

      // Si no hay tickets disponibles en absoluto, verificar pausa automática
      if (availability.available === 0 && availability.isFull) {
        // Intentar pausar automáticamente
        const pauseResult = await pauseService.pauseRaffle(
          raffle_id,
          "auto_full"
        );

        if (pauseResult.success) {
          return res.status(400).json({
            error:
              "La rifa se encuentra en PAUSA. Vuelve a intentar tu compra en 15 minutos.",
            isPaused: true,
            pauseInfo: {
              remainingSeconds: 15 * 60, // 15 minutos
              pauseUntil: pauseResult.pauseUntil,
              reason: "auto_full",
            },
          });
        }
      }

      return res.status(400).json({
        error: `Solo hay ${availability.available} boletos disponibles. No puedes comprar ${ticket_quantity} boletos.`,
        availableTickets: availability.available,
      });
    }

    // referencia de pago duplicada
    if (payment_reference && payment_reference.trim()) {
      const normalizedReference = payment_reference.trim();

      console.log("🔍 Verificando referencia de pago:", normalizedReference);

      const [existingReference] = await connection.execute(
        "SELECT id, customer_name, customer_phone FROM purchases WHERE payment_reference = ? AND raffle_id = ?",
        [normalizedReference, raffle_id]
      );

      if (existingReference.length > 0) {
        await connection.rollback();
        console.log(
          "❌ Referencia duplicada encontrada:",
          existingReference[0]
        );

        return res.status(400).json({
          error: `Error: Este número de referencia "${normalizedReference}" ya ha sido utilizado para esta rifa.`,
          details:
            "Cada referencia de pago debe ser única. Verifica tu número de confirmación o contacta al administrador si crees que es un error.",
        });
      }

      console.log("✅ Referencia de pago válida y única");
    }

    // Verificar límites de compra
    if (
      ticket_quantity < raffle.min_purchase ||
      ticket_quantity > raffle.max_purchase
    ) {
      await connection.rollback();
      return res.status(400).json({
        error: `La cantidad debe estar entre ${raffle.min_purchase} y ${raffle.max_purchase} boletos`,
      });
    }

    // Obtener tickets disponibles aleatoriamente
    const [availableTickets] = await connection.execute(
      'SELECT ticket_number FROM tickets WHERE raffle_id = ? AND status = "available" ORDER BY RAND() LIMIT ?',
      [raffle_id, ticket_quantity]
    );

    if (availableTickets.length < ticket_quantity) {
      await connection.rollback();

      // Verificar pausa automática si no hay suficientes tickets
      const currentAvailability =
        await pauseService.checkTicketAvailability(raffle_id);

      if (currentAvailability.isFull) {
        const pauseResult = await pauseService.pauseRaffle(
          raffle_id,
          "auto_full"
        );

        if (pauseResult.success) {
          return res.status(400).json({
            error:
              "La rifa se encuentra en PAUSA. Vuelve a intentar tu compra en 15 minutos.",
            isPaused: true,
            pauseInfo: {
              remainingSeconds: 15 * 60,
              pauseUntil: pauseResult.pauseUntil,
              reason: "auto_full",
            },
          });
        }
      } else if (currentAvailability.available < raffle.min_purchase) {
        const pauseResult = await pauseService.pauseRaffle(
          raffle_id,
          "auto_insufficient"
        );

        if (pauseResult.success) {
          return res.status(400).json({
            error: `La rifa se encuentra en PAUSA porque solo quedan ${currentAvailability.available} boletos disponibles, pero se necesitan al menos ${raffle.min_purchase} para comprar.`,
            isPaused: true,
            pauseInfo: {
              remainingSeconds: 15 * 60,
              pauseUntil: pauseResult.pauseUntil,
              reason: "auto_insufficient",
            },
          });
        }
      }

      return res.status(400).json({
        error: `Solo hay ${availableTickets.length} boletos disponibles`,
      });
    }

    // Extraer los números de tickets seleccionados aleatoriamente
    const selectedTicketNumbers = availableTickets.map((t) => t.ticket_number);

    //  Verificar que los tickets siguen disponibles**
    const placeholders = selectedTicketNumbers.map(() => "?").join(",");
    const [concurrentCheck] = await connection.execute(
      `SELECT ticket_number FROM tickets 
       WHERE raffle_id = ? AND ticket_number IN (${placeholders}) AND status = "available"`,
      [raffle_id, ...selectedTicketNumbers]
    );

    if (concurrentCheck.length !== selectedTicketNumbers.length) {
      await connection.rollback();
      const unavailableTickets = selectedTicketNumbers.filter(
        (num) => !concurrentCheck.some((t) => t.ticket_number === num)
      );

      console.error("❌ ========== CONFLICTO DE CONCURRENCIA ==========");
      console.error("📅 Timestamp:", new Date().toISOString());
      console.error("🔍 Rifa ID:", raffle_id);
      console.error("🎫 Tickets solicitados:", selectedTicketNumbers);
      console.error("❌ Tickets no disponibles:", unavailableTickets);
      console.error("✅ Tickets disponibles encontrados:", concurrentCheck.map(t => t.ticket_number));
      console.error("👤 Cliente:", {
        name: customer_name ? '***' : undefined,
        phone: customer_phone ? '***' : undefined,
        payment_method: payment_method
      });
      console.error("🌐 IP del Cliente:", req.ip || req.connection?.remoteAddress);
      console.error("❌ ===========================================");

      return res.status(409).json({
        error: `¡Oops! Tardaste mucho en completar la compra y alguien más compró los tickets: ${unavailableTickets.join(", ")}. Por favor intenta nuevamente.`,
      });
    }

    // Calcular monto total
    const isDollarMethod = ["usd", "zelle", "zinli", "binance"].includes(
      payment_method
    );
    const pricePerTicket = isDollarMethod ? raffle.price_usd : raffle.price_bs;
    const totalAmount = pricePerTicket * ticket_quantity;

    const payment_proof_url = req.file
      ? `/uploads/payments/${req.file.filename}`
      : null;

    // Crear la compra
    const [purchaseResult] = await connection.execute(
      `INSERT INTO purchases (
        raffle_id, customer_name, customer_phone, customer_email, customer_ci,
        payment_method, payment_reference, payment_proof_url, ticket_quantity,
        total_amount, status, customer_location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        raffle_id,
        customer_name.substring(0, 200),
        customer_phone.substring(0, 20),
        customer_email.substring(0, 100),
        customer_ci.substring(0, 20),
        payment_method,
        payment_reference.substring(0, 100),
        payment_proof_url,
        ticket_quantity,
        totalAmount,
        customer_location ? customer_location.substring(0, 100) : null
      ]
    );

    const purchaseId = purchaseResult.insertId;

    console.log("✅ Compra creada con ID:", purchaseId);
    console.log("🎫 Asignando tickets:", selectedTicketNumbers);

    //  Reservar los tickets específicos seleccionados**
    const updatePromises = selectedTicketNumbers.map((ticketNumber) =>
      connection.execute(
        'UPDATE tickets SET status = "reserved", purchase_id = ? WHERE raffle_id = ? AND ticket_number = ? AND status = "available"',
        [purchaseId, raffle_id, ticketNumber]
      )
    );

    const updateResults = await Promise.all(updatePromises);

    // Verificar que todos los updates fueron exitosos
    const successfulUpdates = updateResults.reduce(
      (acc, [result]) => acc + result.affectedRows,
      0
    );

    if (successfulUpdates !== selectedTicketNumbers.length) {
      await connection.rollback();
      return res.status(409).json({
        error:
          "¡Oops! Algunos tickets ya no están disponibles. Alguien más los compró justo antes que tú. Por favor intenta nuevamente.",
      });
    }

    await connection.commit();

    console.log("✅ Compra procesada exitosamente");

    // PAUSA AUTOMÁTICA DESPUÉS DE LA COMPRA
    setTimeout(async () => {
      try {
        const pauseCheck = await pauseService.checkAutoPause(raffle_id);
        if (pauseCheck.needsPause) {
          console.log(
            `🔄 Activando pausa automática para rifa ${raffle_id}:`,
            pauseCheck.reason
          );
          console.log(`📊 Tipo de pausa: ${pauseCheck.pauseType}`);
          await pauseService.pauseRaffle(raffle_id, pauseCheck.pauseType);
        }
      } catch (error) {
        console.error("❌ Error en verificación de pausa automática:", error);
      }
    }, 1000); // Ejecutar después de 1 segundo para no bloquear la respuesta

    console.log("📧 Preparando email de confirmación...");

    // email de confirmación automáticamente
    const purchaseData = {
      purchase_id: purchaseId,
      customer_name,
      customer_phone,
      customer_email,
      customer_ci,
      raffle_name: raffle.name,
      ticket_quantity,
      payment_method,
      payment_reference,
      total_amount: totalAmount,
    };

    // Enviar email de confirmación (no bloquear la respuesta si falla)
    emailService
      .sendPurchaseConfirmationEmail(purchaseData, selectedTicketNumbers)
      .then((emailResult) => {
        if (emailResult.success) {
          console.log("✅ Email de confirmación enviado exitosamente");
        } else {
          console.error(
            "⚠️ Error enviando email de confirmación:",
            emailResult.error
          );
        }
      })
      .catch((emailError) => {
        console.error("💥 Error crítico enviando email:", emailError);
      });

    res.status(201).json({
      message: "Compra registrada exitosamente",
      purchase_id: purchaseId,
      ticket_numbers: selectedTicketNumbers.sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
      total_amount: totalAmount,
    });
  } catch (error) {
    await connection.rollback();

    // Logging detallado del error
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorType: error.name || 'UnknownError',
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      requestData: {
        raffle_id: req.body?.raffle_id,
        customer_name: req.body?.customer_name,
        customer_phone: req.body?.customer_phone,
        customer_email: req.body?.customer_email,
        customer_ci: req.body?.customer_ci,
        payment_method: req.body?.payment_method,
        payment_reference: req.body?.payment_reference,
        ticket_quantity: req.body?.ticket_quantity,
        customer_location: req.body?.customer_location,
        hasFile: !!req.file,
        fileSize: req.file?.size,
        fileName: req.file?.filename
      },
      requestHeaders: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      },
      requestIP: req.ip || req.connection?.remoteAddress,
      requestURL: req.originalUrl || req.url,
      requestMethod: req.method
    };

    console.error("❌ ========== ERROR AL CREAR COMPRA ==========");
    console.error("📅 Timestamp:", errorLog.timestamp);
    console.error("🔴 Tipo de Error:", errorLog.errorType);
    console.error("💬 Mensaje:", errorLog.errorMessage);
    console.error("🔢 Código de Error:", errorLog.errorCode);
    if (errorLog.sqlMessage) {
      console.error("🗄️ SQL Message:", errorLog.sqlMessage);
      console.error("🗄️ SQL State:", errorLog.sqlState);
    }
    console.error("📋 Datos del Request:", JSON.stringify(errorLog.requestData, null, 2));
    console.error("🌐 Headers del Request:", JSON.stringify(errorLog.requestHeaders, null, 2));
    console.error("📍 IP del Cliente:", errorLog.requestIP);
    console.error("🔗 URL:", errorLog.requestURL);
    console.error("📤 Método:", errorLog.requestMethod);
    if (errorLog.errorStack) {
      console.error("📚 Stack Trace:", errorLog.errorStack);
    }
    console.error("❌ ===========================================");

    // Error específico de referencia duplicada
    if (
      error.code === "ER_DUP_ENTRY" &&
      error.sqlMessage.includes("payment_reference")
    ) {
      console.error("⚠️ Error de referencia duplicada detectado");
      return res.status(400).json({
        error:
          "Error: Este número de referencia ya ha sido utilizado. Cada referencia debe ser única.",
        details: "Verifica tu número de confirmación de pago.",
      });
    }

    // Error de validación
    if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
      console.error("⚠️ Error de validación detectado");
      return res.status(400).json({
        error: error.message || "Error de validación en los datos enviados",
        details: error.details || {}
      });
    }

    // Error de base de datos
    if (error.code && error.code.startsWith('ER_')) {
      console.error("⚠️ Error de base de datos detectado:", error.code);
      return res.status(500).json({
        error: "Error al procesar la compra en la base de datos",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Error genérico
    console.error("⚠️ Error genérico no manejado");
    res.status(500).json({
      error: "Error interno del servidor",
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        errorType: error.name
      })
    });
  } finally {
    connection.release();
  }
};

const getAllPurchases = async (req, res) => {
  try {
    const {
      status,
      raffle_id,
      payment_method,
      limit = 50,
      page = 1,
      search,
      search_type,
      start,
      end,
    } = req.query;
    let columns = [];
    let query = `
      SELECT p.*, r.name as raffle_name, r.price_bs,
      GROUP_CONCAT(t.ticket_number ORDER BY t.ticket_number) as ticket_numbers,
      (SELECT COUNT(*) FROM tickets tk
        WHERE tk.raffle_id = p.raffle_id AND tk.status = 'available') AS raffle_available_tickets
      FROM purchases p
      JOIN raffles r ON p.raffle_id = r.id
      LEFT JOIN tickets t ON p.id = t.purchase_id
      WHERE 1=1
    `;

    const params = [];

    if (status && status != "all") {
      query += " AND p.status = ?";
      params.push(status);
    }

    if (raffle_id) {
      query += " AND p.raffle_id = ?";
      params.push(raffle_id);
    }

    if (payment_method) {
      query += " AND p.payment_method = ?";
      params.push(payment_method);
    }

    if (search) {
      console.log("search: ", search);
      console.log("search_type: ", search_type);

      if (search_type && search_type !== "all") {
        columns = {
          name: "p.customer_name",
          phone: "p.customer_phone",
          email: "p.customer_email",
          ci: "p.customer_ci",
          ticket: "t.ticket_number",
        };
        console.log("columns ", columns);
        query += ` AND ${columns[search_type]} LIKE CONCAT('%', ?, '%')`;
      } else {
        query += ` AND CONCAT(p.customer_name,' ',p.customer_phone,' ',p.customer_email,' ',p.customer_ci,' ',t.ticket_number,' ',p.payment_reference) LIKE CONCAT('%', ?, '%')`;
      }
      params.push(search);
    }

    if (start) {
      query += " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) >= ?";
      params.push(start);
    }
    if (end) {
      query += " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) <= ?";
      params.push(end);
    }

    query += " GROUP BY p.id ORDER BY p.created_at DESC";

    let offset = 0;

    // Paginación corregida
    if (limit && limit !== "all") {
      const parsedLimit = parseInt(limit, 10);
      const parsedPage = parseInt(page, 10);

      const safeLimitNum =
        !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
      const safePageNum = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      offset = (safePageNum - 1) * safeLimitNum;

      query += ` LIMIT ${safeLimitNum} OFFSET ${offset}`;
    }

    console.log("SQL getAllPurchases:", query);
    console.log("Parámetros:", params);

    const [rows] = await db.execute(query, params);
    const countResult = await db.execute(
      `SELECT COUNT(*) AS count
      FROM purchases p
      JOIN raffles r ON p.raffle_id = r.id
      WHERE 1=1
      
      ${status && status != "all" ? " AND p.status = ?" : ""}
      ${raffle_id ? " AND p.raffle_id = ?" : ""}
      ${payment_method ? " AND p.payment_method = ?" : ""}
      ${start ? " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) >= ?" : ""}
      ${end ? " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) <= ?" : ""}
      ${search && search_type && search_type != "all" ? ` AND ${columns[search_type]} LIKE CONCAT('%', ?, '%')` : ""}
      ${search && search_type === "all" ? ` AND CONCAT(p.customer_name,' ',p.customer_phone,' ',p.customer_email,' ',p.customer_ci,' ',p.payment_reference) LIKE CONCAT('%', ?, '%')` : ""}
      `,
      params
    );

    const count = countResult[0][0];

    const nextPage = count.count / limit > page;

    res.json({ data: rows, count, nextPage });
  } catch (error) {
    console.error("Error al obtener compras:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const getClientPurchases = async (req, res) => {
  try {
    const {
      status,
      raffle_id,
      payment_method,
      limit = 10,
      page = 1,
      start,
      end,
    } = req.query;

    let query = `
      select 
      p.raffle_id, p.customer_name , p.customer_ci , p.customer_phone , p.customer_email
      ,sum(p.ticket_quantity) as ticket_quantity
      ,SUM(IF(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd'), (p.ticket_quantity * r.price_bs), (p.total_amount))) as total
      ,SUM(IF(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd'), (p.total_amount), 0)) as total_usd
      ,SUM(IF(p.payment_method IN ('pago_movil', 'bs'), (p.total_amount),0)) as total_bs      
      ,p.payment_method
      ,p.status
      ,COUNT(DISTINCT p.raffle_id) AS rifas
      ,COUNT(DISTINCT p.id) AS purchases
      FROM purchases p
      JOIN raffles r ON p.raffle_id = r.id
      WHERE 1=1 
    `;

    const params = [];

    if (status) {
      query += " AND p.status = ?";
      params.push(status);
    }

    if (raffle_id) {
      query += " AND p.raffle_id = ?";
      params.push(raffle_id);
    }

    if (payment_method) {
      query += " AND p.payment_method = ?";
      params.push(payment_method);
    }

    if (start) {
      query += " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) >= ?";
      params.push(start);
    }
    if (end) {
      query += " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) <= ?";
      params.push(end);
    }

    query += " GROUP BY p.customer_ci ORDER BY total desc limit " + limit;

    console.log("SQL getClientPurchases:", query);
    console.log("Parámetros:", params);

    const [rows] = await db.execute(query, params);

    const countResult = await db.execute(
      `SELECT COUNT(*) AS count
      FROM purchases p
      JOIN raffles r ON p.raffle_id = r.id
      WHERE 1=1     
      ${status ? " AND p.status = ?" : ""}
      ${raffle_id ? " AND p.raffle_id = ?" : ""}
      ${payment_method ? " AND p.payment_method = ?" : ""}
      ${start ? " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) >= ?" : ""}
      ${end ? " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) <= ?" : ""}
      `,
      params
    );

    const count = countResult[0][0];

    const nextPage = count.count / limit > page;

    res.json({ data: rows, count, nextPage });
  } catch (error) {
    console.error("Error al obtener compras de clientes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const getAnalyticsPurchases = async (req, res) => {
  try {
    const {
      status,
      raffle_id,
      payment_method,
      limit = 50,
      page = 1,
      start,
      end,
    } = req.query;

    let query = `
      select 
      count(distinct(p.id)) total_purchases
      ,SUM(IF(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd'), (p.total_amount), 0)) as total_usd
      ,SUM(IF(p.payment_method IN ('pago_movil', 'bs'), (p.total_amount),0)) as total_bs
      ,sum(p.ticket_quantity) as ticket_quantity
      ,count(distinct p.customer_name) as clients
      ,(count(distinct(if(p.payment_method IN ('pago_movil', 'bs'), p.customer_ci, null)))) as clients_bs
      ,(count(distinct(if(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd'), p.customer_ci, null)))) as clients_usd
      ,(SUM(IF(p.payment_method IN ('pago_movil', 'bs'), (p.total_amount),0)))/ (count(distinct(if(p.payment_method IN ('pago_movil', 'bs'), p.customer_ci, null)))) prom_bs
      ,(SUM(IF(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd'), (p.total_amount),0)))/ (count(distinct(if(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd'), p.customer_ci, null)))) prom_usd
      ,SUM(IF(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd') and p.status in ('approved'), (p.total_amount), 0)) as approved_usd
      ,SUM(IF(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd') and p.status in ('pending'), (p.total_amount), 0)) as pending_usd
      ,SUM(IF(p.payment_method IN ('zelle', 'zinli', 'binance', 'usd') and p.status in ('rejected'), (p.total_amount), 0)) as rejected_usd
      ,SUM(IF(p.payment_method IN ('pago_movil', 'bs') and p.status in ('approved'), (p.total_amount), 0)) as approved_bs
      ,SUM(IF(p.payment_method IN ('pago_movil', 'bs') and p.status in ('pending'), (p.total_amount), 0)) as pending_bs
      ,SUM(IF(p.payment_method IN ('pago_movil', 'bs') and p.status in ('rejected'), (p.total_amount), 0)) as rejected_bs
      ,SUM(IF(p.payment_method IN ('pago_movil'), (p.total_amount), 0)) as total_pagomovil
      ,SUM(IF(p.payment_method IN ('bs'), (p.total_amount), 0)) as total_pbs
      ,SUM(IF(p.payment_method IN ('zelle'), (p.total_amount), 0)) as total_zelle
      ,SUM(IF(p.payment_method IN ('zinli'), (p.total_amount), 0)) as total_zinli
      ,SUM(IF(p.payment_method IN ('binance'), (p.total_amount), 0)) as total_binance
      ,SUM(IF(p.payment_method IN ('usd'), (p.total_amount), 0)) as total_pusd
      from purchases p 
      join raffles r on p.raffle_id = r.id
      WHERE 1=1        
    `;

    const params = [];

    if (status) {
      query += " AND p.status = ?";
      params.push(status);
    }

    if (raffle_id) {
      query += " AND p.raffle_id = ?";
      params.push(raffle_id);
    }

    if (payment_method) {
      query += " AND p.payment_method = ?";
      params.push(payment_method);
    }

    if (start) {
      query += " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) >= ?";
      params.push(start);
    }
    if (end) {
      query += " AND date(CONVERT_TZ(p.created_at, '+00:00', '-04:00')) <= ?";
      params.push(end);
    }

    console.log("SQL getAnalyticsPurchases:");
    console.log("Parámetros:", params);

    const [rows] = await db.execute(query, params);

    res.json({ data: rows.at(0) });
  } catch (error) {
    console.error("Error al obtener analytics de clientes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const updatePurchaseStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      await connection.rollback();
      return res.status(400).json({ error: "Estado no válido" });
    }

    // Obtener la compra con información de la rifa
    const [purchaseRows] = await connection.execute(
      `SELECT p.*, r.name as raffle_name, r.id as raffle_id
       FROM purchases p 
       JOIN raffles r ON p.raffle_id = r.id 
       WHERE p.id = ?`,
      [id]
    );

    if (purchaseRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    const purchase = purchaseRows[0];
    /*
    //     no permitir cambios si ya está aprobada o rechazada
    if (
      ["approved", "rejected"].includes(purchase.status) &&
      purchase.status !== status
    ) {
      await connection.rollback();
      return res.status(400).json({
        error: `No se puede cambiar el estado de una compra que ya está ${purchase.status === "approved" ? "aprobada" : "rechazada"}. Estado actual: ${purchase.status === "approved" ? "Aprobada" : "Rechazada"}`,
        currentStatus: purchase.status,
      });
    }
    */
    // que tenga tickets asignados antes de aprobar/rechazar
    if (["approved", "rejected"].includes(status)) {
      const [ticketCount] = await connection.execute(
        "SELECT COUNT(*) as ticket_count FROM tickets WHERE purchase_id = ?",
        [id]
      );

      if (ticketCount[0].ticket_count === 0) {
        await connection.rollback();
        return res.status(400).json({
          error:
            "No se puede aprobar o rechazar una compra sin boletos asignados",
          action: "assign_tickets_first",
        });
      }
    }

    // si ya tiene el mismo estado, no hacer nada
    if (purchase.status === status) {
      await connection.rollback();
      return res.json({
        message: `La compra ya está ${status === "approved" ? "aprobada" : status === "rejected" ? "rechazada" : "pendiente"}`,
        status: status,
        noChange: true,
      });
    }

    console.log(
      `🔄 Cambiando estado de compra ${id}: ${purchase.status} → ${status}`
    );

    // Actualizar estado de la compra
    await connection.execute(
      "UPDATE purchases SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, notes, id]
    );

    // Actualizar estado de los tickets
    let ticketStatus;
    if (status === "approved") {
      ticketStatus = "sold";
    } else if (status === "rejected") {
      ticketStatus = "available";
    } else {
      ticketStatus = "reserved";
    }

    await connection.execute(
      "UPDATE tickets SET status = ? WHERE purchase_id = ?",
      [ticketStatus, id]
    );

    // Si se rechaza, liberar los tickets
    if (status === "rejected") {
      await connection.execute(
        "UPDATE tickets SET purchase_id = NULL WHERE purchase_id = ?",
        [id]
      );
    }

    //       Obtener números de tickets para el email
    const [ticketRows] = await connection.execute(
      "SELECT ticket_number FROM tickets WHERE purchase_id = ? ORDER BY ticket_number",
      [id]
    );

    const ticketNumbers = ticketRows.map((row) => row.ticket_number);

    await connection.commit();

    console.log(
      `✅ Estado de compra ${id} actualizado exitosamente: ${purchase.status} → ${status}`
    );

    // VERIFICAR SI NECESITA REACTIVAR RIFA DESPUÉS DE RECHAZAR
    if (status === "rejected") {
      setTimeout(async () => {
        try {
          // Verificar si la rifa está pausada y puede reactivarse
          const pauseInfo = await pauseService.getPauseInfo(purchase.raffle_id);
          if (
            pauseInfo &&
            pauseInfo.isPaused &&
            pauseInfo.pauseReason === "auto_full"
          ) {
            const availability = await pauseService.checkTicketAvailability(
              purchase.raffle_id
            );
            if (availability.available > 0) {
              console.log(
                `🔄 Reactivando rifa ${purchase.raffle_id} después de rechazar compra`
              );
              await pauseService.unpauseRaffle(purchase.raffle_id);
            }
          }
        } catch (error) {
          console.error("❌ Error en verificación de reactivación:", error);
        }
      }, 1000);
    }

    // enviaremail de actualización de estado (solo para approved/rejected)
    if (status === "approved" || status === "rejected") {
      console.log("📧 Preparando email de actualización de estado...");

      const purchaseData = {
        ...purchase,
        purchase_id: purchase.id,
      };

      // Enviar email de actualización (no bloquear la respuesta si falla)
      /*emailService
        .sendStatusUpdateEmail(purchaseData, status, ticketNumbers)
        .then((emailResult) => {
          if (emailResult.success) {
            console.log(
              "✅ Email de actualización de estado enviado exitosamente"
            );
          } else {
            console.error(
              "⚠️ Error enviando email de actualización:",
              emailResult.error
            );
          }
        })
        .catch((emailError) => {
          console.error(
            "💥 Error crítico enviando email de actualización:",
            emailError
          );
        });*/
    }

    res.json({
      message: `Estado de compra actualizado exitosamente: ${purchase.status} → ${status}`,
      status: status,
      previousStatus: purchase.status,
      ticketCount: ticketNumbers.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al actualizar compra:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `
      SELECT p.*, r.name as raffle_name,
             GROUP_CONCAT(t.ticket_number ORDER BY t.ticket_number) as ticket_numbers
      FROM purchases p
      JOIN raffles r ON p.raffle_id = r.id
      LEFT JOIN tickets t ON p.id = t.purchase_id
      WHERE p.id = ?
      GROUP BY p.id
    `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener compra:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// agregar boletos a una compra existente
const addTicketsToPurchase = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { quantity } = req.body;

    console.log("📨 Agregando boletos - ID:", id, "Cantidad:", quantity);

    const quantityInt = parseInt(quantity, 10);
    if (!Number.isFinite(quantityInt) || quantityInt < 1) {
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "La cantidad debe ser un entero mayor a 0" });
    }
    if (quantityInt > 50000) {
      await connection.rollback();
      return res.status(400).json({
        error: "La cantidad no puede superar 50,000 boletos por operación",
      });
    }
    const purchaseId = parseInt(id, 10);

    // Obtener la compra con información de la rifa
    const [purchaseRows] = await connection.execute(
      `SELECT p.*, r.price_bs, r.price_usd, r.name as raffle_name, r.min_purchase 
       FROM purchases p 
       JOIN raffles r ON p.raffle_id = r.id 
       WHERE p.id = ?`,
      [purchaseId]
    );

    if (purchaseRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    const purchase = purchaseRows[0];

    // No permitir en compras rechazadas
    // Las compras pendientes y aprobadas SÍ se pueden modificar, pero las rechazadas NO
    if (purchase.status === "rejected") {
      await connection.rollback();
      return res.status(400).json({
        error:
          "No se pueden agregar boletos a una compra rechazada. Las compras rechazadas son inmutables.",
        currentStatus: purchase.status,
        action: "cannot_modify_rejected",
      });
    }

    // VERIFICAR DISPONIBILIDAD ANTES DE AGREGA
    const availability = await pauseService.checkTicketAvailability(
      purchase.raffle_id
    );

    if (availability.available < quantityInt) {
      await connection.rollback();
      return res.status(400).json({
        error: `Solo hay ${availability.available} boletos disponibles para esta rifa`,
        availableTickets: availability.available,
      });
    }

    // que después de agregar boletos, aún queden suficientes para la compra mínima**
    const remainingAfterPurchase = availability.available - quantityInt;
    if (
      remainingAfterPurchase > 0 &&
      remainingAfterPurchase < purchase.min_purchase
    ) {
      console.log(
        `⚠️ Advertencia: Agregar ${quantityInt} boletos dejará ${remainingAfterPurchase} boletos disponibles (menos que la compra mínima de ${purchase.min_purchase})`
      );
      // Permitir la operación pero la rifa se pausará automáticamente después
    }

    const [availableTickets] = await connection.execute(
      `SELECT ticket_number FROM tickets WHERE raffle_id = ? AND status = "available" ORDER BY RAND() LIMIT ${quantityInt}`,
      [purchase.raffle_id]
    );

    if (availableTickets.length < quantityInt) {
      await connection.rollback();
      return res.status(400).json({
        error: `Solo hay ${availableTickets.length} boletos disponibles para esta rifa`,
      });
    }

    const selectedTicketNumbers = availableTickets.map((t) => t.ticket_number);

    // Verificar disponibilidad por concurrencia
    const placeholders = selectedTicketNumbers.map(() => "?").join(",");
    const [concurrentCheck] = await connection.execute(
      `SELECT ticket_number FROM tickets 
       WHERE raffle_id = ? AND ticket_number IN (${placeholders}) AND status = "available"`,
      [purchase.raffle_id, ...selectedTicketNumbers]
    );

    if (concurrentCheck.length !== selectedTicketNumbers.length) {
      await connection.rollback();
      return res.status(409).json({
        error:
          "Algunos boletos ya no están disponibles. Por favor intenta nuevamente.",
      });
    }

    // Calcular nuevo monto
    const isDollarMethod = ["usd", "zelle", "zinli", "binance"].includes(
      purchase.payment_method
    );
    const pricePerTicket = isDollarMethod
      ? purchase.price_usd
      : purchase.price_bs;
    const additionalAmount = pricePerTicket * quantityInt;
    const newTotalAmount = parseFloat(purchase.total_amount) + additionalAmount;
    const newTicketQuantity = parseInt(purchase.ticket_quantity) + quantityInt;

    // Actualizar la compra
    await connection.execute(
      "UPDATE purchases SET ticket_quantity = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newTicketQuantity, newTotalAmount, purchaseId]
    );

    // Asignar los nuevos boletos (según el estado de la compra)
    const ticketStatus = purchase.status === "approved" ? "sold" : "reserved";
    const updatePromises = selectedTicketNumbers.map((ticketNumber) =>
      connection.execute(
        'UPDATE tickets SET status = ?, purchase_id = ? WHERE raffle_id = ? AND ticket_number = ? AND status = "available"',
        [ticketStatus, purchaseId, purchase.raffle_id, ticketNumber]
      )
    );

    const updateResults = await Promise.all(updatePromises);
    const successfulUpdates = updateResults.reduce(
      (acc, [result]) => acc + result.affectedRows,
      0
    );

    if (successfulUpdates !== selectedTicketNumbers.length) {
      await connection.rollback();
      return res.status(409).json({
        error:
          "Error al asignar algunos boletos. Por favor intenta nuevamente.",
      });
    }

    // todos los números de tickets actuales
    const [allTicketsRows] = await connection.execute(
      "SELECT ticket_number FROM tickets WHERE purchase_id = ? ORDER BY ticket_number",
      [purchaseId]
    );
    const allTicketNumbers = allTicketsRows.map((row) => row.ticket_number);

    await connection.commit();

    console.log(
      `✅ Boletos agregados exitosamente a compra ${purchaseId}:`,
      selectedTicketNumbers
    );

    // VERIFICAR PAUSA AUTOMÁTICA DESPUÉS DE AGREGAR BOLETOS
    setTimeout(async () => {
      try {
        const pauseCheck = await pauseService.checkAutoPause(
          purchase.raffle_id
        );
        if (pauseCheck.needsPause) {
          await pauseService.pauseRaffle(
            purchase.raffle_id,
            pauseCheck.pauseType
          );
        }
      } catch (error) {
        console.error("❌ Error en verificación de pausa automática:", error);
      }
    }, 1000);

    //   viar email de modificación de boletos
    if (purchase.customer_email) {
      console.log(
        "📧 Preparando email de modificación de boletos (agregar)..."
      );

      const purchaseData = {
        ...purchase,
        purchase_id: purchase.id,
      };

      const modification = {
        type: "add",
        quantity: quantityInt,
        ticket_numbers: selectedTicketNumbers,
        all_ticket_numbers: allTicketNumbers,
        previous_quantity: parseInt(purchase.ticket_quantity),
        new_quantity: newTicketQuantity,
        amount_change: additionalAmount,
        new_total_amount: newTotalAmount,
      };

      // Enviar email de modificación (no bloquear la respuesta si falla)
      emailService
        .sendTicketModificationEmail(purchaseData, modification)
        .then((emailResult) => {
          if (emailResult.success) {
            console.log(
              "✅ Email de modificación (agregar) enviado exitosamente"
            );
          } else {
            console.error(
              "⚠️ Error enviando email de modificación:",
              emailResult.error
            );
          }
        })
        .catch((emailError) => {
          console.error(
            "💥 Error crítico enviando email de modificación:",
            emailError
          );
        });
    }

    res.json({
      message: "Boletos agregados exitosamente",
      added_tickets: selectedTicketNumbers.sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
      new_quantity: newTicketQuantity,
      additional_amount: additionalAmount,
      new_total_amount: newTotalAmount,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al agregar boletos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// reasignar boletos a una compra existente rechazada
const reassignTicketsToPurchase = async (req, res) => {
  const connection = await db.getConnection();
  const statusPending = "pending";

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status } = req.body;

    console.log("📨 Reasignando boletos - ID:", id, "Estado:", status);

    // Validaciones básicas
    if (!status || !["rejected"].includes(status)) {
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "El estatus indicado no es válido" });
    }

    // Convertir a entero para asegurar tipo correcto
    // const quantityInt = parseInt(quantity, 10);
    const purchaseId = parseInt(id, 10);

    // Obtener la compra con información de la rifa
    const [purchaseRows] = await connection.execute(
      `SELECT p.*, r.price_bs, r.price_usd, r.name as raffle_name, r.min_purchase 
       FROM purchases p 
       JOIN raffles r ON p.raffle_id = r.id 
       WHERE p.id = ? and p.status = ?`,
      [purchaseId, status]
    );

    if (purchaseRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    const purchase = purchaseRows[0];
    const quantityInt = parseInt(purchase.ticket_quantity, 10);

    // No permitir en compras rechazadas
    // Las compras pendientes y aprobadas SÍ se pueden modificar, pero las rechazadas NO
    // if (purchase.status === 'rejected') {
    //   await connection.rollback();
    //   return res.status(400).json({
    //     error: 'No se pueden agregar boletos a una compra rechazada. Las compras rechazadas son inmutables.',
    //     currentStatus: purchase.status,
    //     action: 'cannot_modify_rejected'
    //   });
    // }

    // VERIFICAR DISPONIBILIDAD ANTES DE AGREGA
    const availability = await pauseService.checkTicketAvailability(
      purchase.raffle_id
    );

    // verificar que la cantidad de tickets disponible sea mayor a cero y mayor al minimo de compra
    // if (
    //   // availability.available === 0 ||
    //   availability.available < purchase.min_purchase
    // ) {
    //   await connection.rollback();
    //   return res.status(400).json({
    //     error: `No hay boletos disponibles para esta rifa - Disponibles[${availability.available}] - Mínimo de compra[${purchase.min_purchase}].`,
    //     availableTickets: availability.available,
    //   });
    // }

    // if (availability.available < quantityInt) {
    //   await connection.rollback();
    //   return res.status(400).json({
    //     error: `Solo hay ${availability.available} boletos disponibles para esta rifa`,
    //     availableTickets: availability.available
    //   });
    // }

    // que después de agregar boletos, aún queden suficientes para la compra mínima**
    const remainingAfterPurchase = availability.available - quantityInt;
    if (
      remainingAfterPurchase > 0 &&
      remainingAfterPurchase < purchase.min_purchase
    ) {
      console.log(
        `⚠️ Advertencia: Reasignar ${quantityInt} boletos dejará ${remainingAfterPurchase} boletos disponibles (menos que la compra mínima de ${purchase.min_purchase})`
      );
      // Permitir la operación pero la rifa se pausará automáticamente después
    }

    const [availableTickets] = await connection.execute(
      `SELECT ticket_number FROM tickets WHERE raffle_id = ? AND status = "available" ORDER BY RAND() LIMIT ${quantityInt}`,
      [purchase.raffle_id]
    );

    // if (availableTickets.length < quantityInt) {
    //   await connection.rollback();
    //   return res.status(400).json({
    //     error: `Solo hay ${availableTickets.length} boletos disponibles para esta rifa`
    //   });
    // }

    if (availableTickets.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        error: `No hay boletos disponibles para esta rifa`,
      });
    }

    const selectedTicketNumbers = availableTickets.map((t) => t.ticket_number);

    // Verificar disponibilidad por concurrencia
    const placeholders = selectedTicketNumbers.map(() => "?").join(",");
    const [concurrentCheck] = await connection.execute(
      `SELECT ticket_number FROM tickets 
       WHERE raffle_id = ? AND ticket_number IN (${placeholders}) AND status = "available"`,
      [purchase.raffle_id, ...selectedTicketNumbers]
    );

    if (concurrentCheck.length !== selectedTicketNumbers.length) {
      await connection.rollback();
      return res.status(409).json({
        error:
          "Algunos boletos ya no están disponibles. Por favor intenta nuevamente.",
      });
    }

    // Calcular nuevo monto
    const isDollarMethod = ["usd", "zelle", "zinli", "binance"].includes(
      purchase.payment_method
    );
    const pricePerTicket = isDollarMethod
      ? purchase.price_usd
      : purchase.price_bs;
    const additionalAmount = pricePerTicket * concurrentCheck.length;
    const newTotalAmount = additionalAmount;
    const newTicketQuantity = concurrentCheck.length;

    // Actualizar la compra
    await connection.execute(
      "UPDATE purchases SET ticket_quantity = ?, total_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newTicketQuantity, newTotalAmount, statusPending, purchaseId]
    );

    // Asignar los nuevos boletos (según el estado de la compra)
    const ticketStatus = purchase.status === "approved" ? "sold" : "reserved";
    const updatePromises = selectedTicketNumbers.map((ticketNumber) =>
      connection.execute(
        'UPDATE tickets SET status = ?, purchase_id = ? WHERE raffle_id = ? AND ticket_number = ? AND status = "available"',
        [ticketStatus, purchaseId, purchase.raffle_id, ticketNumber]
      )
    );

    const updateResults = await Promise.all(updatePromises);
    const successfulUpdates = updateResults.reduce(
      (acc, [result]) => acc + result.affectedRows,
      0
    );

    if (successfulUpdates !== selectedTicketNumbers.length) {
      await connection.rollback();
      return res.status(409).json({
        error:
          "Error al asignar algunos boletos. Por favor intenta nuevamente.",
      });
    }

    // todos los números de tickets actuales
    const [allTicketsRows] = await connection.execute(
      "SELECT ticket_number FROM tickets WHERE purchase_id = ? ORDER BY ticket_number",
      [purchaseId]
    );
    const allTicketNumbers = allTicketsRows.map((row) => row.ticket_number);

    await connection.commit();

    console.log(
      `✅ Boletos reasignados exitosamente a compra ${purchaseId}:`,
      selectedTicketNumbers
    );

    // VERIFICAR PAUSA AUTOMÁTICA DESPUÉS DE AGREGAR BOLETOS
    setTimeout(async () => {
      try {
        const pauseCheck = await pauseService.checkAutoPause(
          purchase.raffle_id
        );
        if (pauseCheck.needsPause) {
          await pauseService.pauseRaffle(
            purchase.raffle_id,
            pauseCheck.pauseType
          );
        }
      } catch (error) {
        console.error("❌ Error en verificación de pausa automática:", error);
      }
    }, 1000);

    //   viar email de modificación de boletos
    if (purchase.customer_email) {
      console.log(
        "📧 Preparando email de modificación de boletos (agregar)..."
      );

      const purchaseData = {
        ...purchase,
        purchase_id: purchase.id,
      };

      const modification = {
        type: "add",
        quantity: quantityInt,
        ticket_numbers: selectedTicketNumbers,
        all_ticket_numbers: allTicketNumbers,
        previous_quantity: parseInt(purchase.ticket_quantity),
        new_quantity: newTicketQuantity,
        amount_change: additionalAmount,
        new_total_amount: newTotalAmount,
      };

      // Enviar email de reasignacion de boletos (no bloquear la respuesta si falla)
      emailService
        .sendPurchaseReassignEmail(purchaseData, modification)
        .then((emailResult) => {
          if (emailResult.success) {
            console.log(
              "✅ Email de reasignación de tickets enviado exitosamente"
            );
          } else {
            console.error(
              "⚠️ Error enviando email de reasignación:",
              emailResult.error
            );
          }
        })
        .catch((emailError) => {
          console.error(
            "💥 Error crítico enviando email de modificación:",
            emailError
          );
        });
    }

    res.json({
      message: "Boletos agregados exitosamente",
      status: statusPending,
      added_tickets: selectedTicketNumbers.sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
      new_quantity: newTicketQuantity,
      additional_amount: additionalAmount,
      new_total_amount: newTotalAmount,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al agregar boletos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// quitar boletos de una compra existente
const removeTicketsFromPurchase = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { quantity } = req.body;

    const quantityInt = parseInt(quantity, 10);
    if (!Number.isFinite(quantityInt) || quantityInt < 1) {
      await connection.rollback();
      return res.status(400).json({ error: "La cantidad debe ser mayor a 0" });
    }
    if (quantityInt > 50000) {
      await connection.rollback();
      return res.status(400).json({
        error: "La cantidad no puede superar 50,000 boletos por operación",
      });
    }

    const purchaseId = parseInt(id, 10);

    // Obtener la compra con información de la rifa
    const [purchaseRows] = await connection.execute(
      `SELECT p.*, r.price_bs, r.price_usd, r.name as raffle_name 
       FROM purchases p 
       JOIN raffles r ON p.raffle_id = r.id 
       WHERE p.id = ?`,
      [purchaseId]
    );

    if (purchaseRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Compra no encontrada" });
    }

    const purchase = purchaseRows[0];

    // NO permitir en compras rechazadas**
    // Las compras pendientes y aprobadas SÍ se pueden modificar, pero las rechazadas NO
    if (purchase.status === "rejected") {
      await connection.rollback();
      return res.status(400).json({
        error:
          "No se pueden quitar boletos de una compra rechazada. Las compras rechazadas son inmutables.",
        currentStatus: purchase.status,
        action: "cannot_modify_rejected",
      });
    }

    // Verificar que no se quiten más boletos de los que tiene
    const currentQuantity = parseInt(purchase.ticket_quantity);
    if (quantityInt >= currentQuantity) {
      await connection.rollback();
      return res.status(400).json({
        error:
          "No se pueden quitar todos los boletos. Debe quedar al menos 1 boleto.",
        currentQuantity: currentQuantity,
        requestedToRemove: quantityInt,
      });
    }

    const [purchaseTickets] = await connection.execute(
      `SELECT ticket_number FROM tickets WHERE purchase_id = ? ORDER BY RAND() LIMIT ${quantityInt}`,
      [purchaseId]
    );

    if (purchaseTickets.length < quantityInt) {
      await connection.rollback();
      return res.status(400).json({
        error: `Solo se pueden quitar ${purchaseTickets.length} boletos de esta compra`,
      });
    }

    const ticketsToRemove = purchaseTickets.map((t) => t.ticket_number);

    // Calcular nuevo monto
    const isDollarMethod = ["usd", "zelle", "zinli", "binance"].includes(
      purchase.payment_method
    );
    const pricePerTicket = isDollarMethod
      ? purchase.price_usd
      : purchase.price_bs;
    const deductedAmount = pricePerTicket * quantityInt;
    const newTotalAmount = parseFloat(purchase.total_amount) - deductedAmount;
    const newTicketQuantity = currentQuantity - quantityInt;

    // Actualizar la compra
    await connection.execute(
      "UPDATE purchases SET ticket_quantity = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newTicketQuantity, newTotalAmount, purchaseId]
    );

    // Liberar los boletos
    const placeholders = ticketsToRemove.map(() => "?").join(",");
    await connection.execute(
      `UPDATE tickets SET status = 'available', purchase_id = NULL 
       WHERE purchase_id = ? AND ticket_number IN (${placeholders})`,
      [purchaseId, ...ticketsToRemove]
    );

    // todos los números de tickets restantes
    const [remainingTicketsRows] = await connection.execute(
      "SELECT ticket_number FROM tickets WHERE purchase_id = ? ORDER BY ticket_number",
      [purchaseId]
    );
    const remainingTicketNumbers = remainingTicketsRows.map(
      (row) => row.ticket_number
    );

    await connection.commit();

    console.log(
      `✅ Boletos removidos exitosamente de compra ${purchaseId}:`,
      ticketsToRemove
    );

    //SI NECESITA REACTIVAR RIFA DESPUÉS DE LIBERAR BOLETOS
    setTimeout(async () => {
      try {
        const pauseInfo = await pauseService.getPauseInfo(purchase.raffle_id);
        if (
          pauseInfo &&
          pauseInfo.isPaused &&
          pauseInfo.pauseReason === "auto_full"
        ) {
          const availability = await pauseService.checkTicketAvailability(
            purchase.raffle_id
          );
          if (availability.available > 0) {
            console.log(
              `🔄 Reactivando rifa ${purchase.raffle_id} después de liberar boletos`
            );
            await pauseService.unpauseRaffle(purchase.raffle_id);
          }
        }
      } catch (error) {
        console.error("❌ Error en verificación de reactivación:", error);
      }
    }, 1000);

    // enviar email de modificación de boletos
    if (purchase.customer_email) {
      console.log("📧 Preparando email de modificación de boletos (quitar)...");

      const purchaseData = {
        ...purchase,
        purchase_id: purchase.id,
      };

      const modification = {
        type: "remove",
        quantity: quantityInt,
        ticket_numbers: ticketsToRemove,
        all_ticket_numbers: remainingTicketNumbers,
        previous_quantity: currentQuantity,
        new_quantity: newTicketQuantity,
        amount_change: deductedAmount,
        new_total_amount: newTotalAmount,
      };

      // Enviar email de modificación (no bloquear la respuesta si falla)
      emailService
        .sendTicketModificationEmail(purchaseData, modification)
        .then((emailResult) => {
          if (emailResult.success) {
            console.log(
              "✅ Email de modificación (quitar) enviado exitosamente"
            );
          } else {
            console.error(
              "⚠️ Error enviando email de modificación:",
              emailResult.error
            );
          }
        })
        .catch((emailError) => {
          console.error(
            "💥 Error crítico enviando email de modificación:",
            emailError
          );
        });
    }

    res.json({
      message: "Boletos removidos exitosamente",
      removed_tickets: ticketsToRemove.sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
      new_quantity: newTicketQuantity,
      deducted_amount: deductedAmount,
      new_total_amount: newTotalAmount,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al quitar boletos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

module.exports = {
  createPurchase,
  getAllPurchases,
  getClientPurchases,
  getAnalyticsPurchases,
  updatePurchaseStatus,
  getPurchaseById,
  addTicketsToPurchase,
  reassignTicketsToPurchase,
  removeTicketsFromPurchase,
};
