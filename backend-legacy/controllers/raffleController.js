const db = require("../config/database");
const { validationResult } = require("express-validator");
const pauseService = require("../services/pauseService");

const getAllRaffles = async (req, res) => {
  try {
    //Extraer y arreglar los parámetros de consulta
    let { status, limit, page } = req.query;

    // Construir la consulta base
    let query = `
      SELECT r.*,
             COUNT(DISTINCT p.id) AS total_prizes,
             COUNT(DISTINCT CASE WHEN t.status = 'sold' THEN t.id END) AS total_tickets_sold,
             (SELECT COUNT(*) FROM tickets WHERE raffle_id = r.id AND status = 'available') AS available_tickets
      FROM raffles r
      LEFT JOIN prizes p ON r.id = p.raffle_id
      LEFT JOIN tickets t ON r.id = t.raffle_id
    `;

    // Array para los parámetros de la consulta
    const params = [];

    // Agregar filtro de status si existe
    if (status && status !== "all") {
      // Si es string separado por comas, conviértelo en array
      const statusList = Array.isArray(status)
        ? status
        : status
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

      if (statusList.length > 0) {
        const placeholders = statusList.map(() => "?").join(", ");
        query += ` WHERE r.status IN (${placeholders})`;
        params.push(...statusList);
      }
    }

    query += " GROUP BY r.id ORDER BY r.created_at DESC";

    // paginación
    if (limit && limit !== "all") {
      const parsedLimit = parseInt(limit, 10);
      const parsedPage = parseInt(page, 10);

      // Asegurar valores válidos
      const safeLimitNum =
        !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
      const safePageNum = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const offset = (safePageNum - 1) * safeLimitNum;

      query += ` LIMIT ${safeLimitNum} OFFSET ${offset}`;
    }

    // Ejecutar
    const [rows] = await db.execute(query, params);

    // Calcular estadísticas adicionales
    const rafflesWithStats = rows.map((raffle) => {
      const totalTickets = raffle.total_tickets || 0;
      const sold = raffle.total_tickets_sold || 0;
      const soldPct =
        totalTickets > 0 ? ((sold / totalTickets) * 100).toFixed(2) : "0.00";

      let daysRemaining = null;
      if (raffle.draw_date) {
        const today = new Date();
        const drawDate = new Date(raffle.draw_date);
        const diffMs = drawDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        ...raffle,
        sold_percentage: soldPct,
        days_remaining: daysRemaining,
      };
    });

    return res.json(rafflesWithStats);
  } catch (error) {
    console.error("Error al obtener rifas:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

const getRaffleById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el ID sea un número
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "ID de rifa inválido" });
    }

    // Obtener datos de la rifa
    const [raffleRows] = await db.execute(
      `SELECT r.*,
              COUNT(DISTINCT p.id) AS total_prizes,
              COUNT(DISTINCT CASE WHEN t.status = 'sold' THEN t.id END) AS tickets_sold,
              COUNT(DISTINCT CASE WHEN t.status = 'available' THEN t.id END) AS tickets_available,
              COUNT(DISTINCT CASE WHEN t.status = 'reserved' THEN t.id END) AS tickets_reserved
       FROM raffles r
       LEFT JOIN prizes p ON r.id = p.raffle_id
       LEFT JOIN tickets t ON r.id = t.raffle_id
       WHERE r.id = ?
       GROUP BY r.id`,
      [parseInt(id)]
    );

    if (raffleRows.length === 0) {
      return res.status(404).json({ error: "Rifa no encontrada" });
    }

    const raffle = raffleRows[0];

    // Obtener premios
    const [prizes] = await db.execute(
      "SELECT * FROM prizes WHERE raffle_id = ? ORDER BY position",
      [parseInt(id)]
    );

    // Obtener métodos de pago
    const [paymentMethods] = await db.execute(
      "SELECT * FROM payment_methods WHERE raffle_id = ? AND is_active = true",
      [parseInt(id)]
    );

    return res.json({
      ...raffle,
      prizes,
      payment_methods: paymentMethods,
      sold_percentage: raffle.total_tickets
        ? ((raffle.tickets_sold / raffle.total_tickets) * 100).toFixed(2)
        : "0.00",
      days_remaining: raffle.draw_date
        ? Math.ceil(
          (new Date(raffle.draw_date) - new Date()) / (1000 * 60 * 60 * 24)
        )
        : null,
    });
  } catch (error) {
    console.error("Error al obtener rifa:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


// Devuelve los detalles completos de la primera rifa activa o pausada
const getFirstActiveRaffleDetails = async (req, res) => {
  try {
    // Buscar la primera rifa con status 'active' o 'paused', ordenada por fecha de creación
    const [raffleRows] = await db.execute(
      `SELECT r.id,
              r.name,
              r.description,
              r.image_url,
              r.total_tickets,
              r.price_bs,
              r.price_usd,
              r.min_purchase,
              r.max_purchase,
              r.draw_date,
              r.percentage_mode,
              r.activation_percentage,
              r.days_for_draw,
              r.status,
              r.created_at,
              r.updated_at,
              r.publish,
              COUNT(DISTINCT p.id) AS total_prizes,
              COUNT(DISTINCT CASE WHEN t.status = 'sold' THEN t.id END) AS tickets_sold,
              COUNT(DISTINCT CASE WHEN t.status = 'available' THEN t.id END) AS tickets_available,
              COUNT(DISTINCT CASE WHEN t.status = 'reserved' THEN t.id END) AS tickets_reserved
       FROM raffles r
       LEFT JOIN prizes p ON r.id = p.raffle_id
       LEFT JOIN tickets t ON r.id = t.raffle_id
       WHERE r.status IN ('active', 'paused')
       GROUP BY r.id
       ORDER BY r.created_at DESC
       LIMIT 1`
    );

    if (!raffleRows || raffleRows.length === 0) {
      return res.status(404).json({ error: "No hay rifas activas o pausadas" });
    }

    const raffle = raffleRows[0];
    const raffleId = raffle.id;

    // Obtener premios y métodos de pago en paralelo
    const [prizes, paymentMethods] = await Promise.all([
      db.execute("SELECT * FROM prizes WHERE raffle_id = ? ORDER BY position", [raffleId]).then(r => r[0]),
      db.execute("SELECT * FROM payment_methods WHERE raffle_id = ? AND is_active = true", [raffleId]).then(r => r[0]),
    ]);

    return res.json({
      ...raffle,
      prizes,
      payment_methods: paymentMethods,
      sold_percentage: raffle.total_tickets
        ? ((raffle.tickets_sold / raffle.total_tickets) * 100).toFixed(2)
        : "0.00",
      days_remaining: raffle.draw_date
        ? Math.ceil((new Date(raffle.draw_date) - new Date()) / (1000 * 60 * 60 * 24))
        : null,
    });
  } catch (error) {
    console.error("Error al obtener detalles de la primera rifa activa:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

const createRaffle = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await connection.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    console.log("📝 Datos recibidos para crear rifa:", req.body);
    console.log("📁 Archivos recibidos:", req.files);

    const {
      name,
      description,
      total_tickets,
      price_bs,
      price_usd,
      min_purchase = 1,
      max_purchase = 10,
      draw_date,
      percentage_mode = false,
      activation_percentage,
      days_for_draw,
      status = "draft",
      auto_pause_enabled = true,
    } = req.body;

    // Parsear prizes y payment_methods si vienen como string
    let prizes = [];
    let payment_methods = [];

    try {
      if (req.body.prizes) {
        prizes =
          typeof req.body.prizes === "string"
            ? JSON.parse(req.body.prizes)
            : req.body.prizes;
      }
      if (req.body.payment_methods) {
        payment_methods =
          typeof req.body.payment_methods === "string"
            ? JSON.parse(req.body.payment_methods)
            : req.body.payment_methods;
      }
      console.log("📦 Premios parseados:", prizes);
      console.log("💳 Métodos de pago parseados:", payment_methods);
    } catch (parseError) {
      await connection.rollback();
      console.error("❌ Error al parsear JSON:", parseError);
      return res.status(400).json({ error: "Error al parsear datos JSON" });
    }

    // Manejar imagen principal
    let image_url = null;
    if (req.files && req.files.image && req.files.image[0]) {
      image_url = `/uploads/raffles/${req.files.image[0].filename}`;
      console.log("🖼️ Imagen principal guardada:", image_url);
    }

    // Validaciones adicionales
    if (!name || !total_tickets || !price_bs || !price_usd) {
      await connection.rollback();
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    console.log("✅ Validaciones pasadas, creando rifa...");

    // crear la rifa con auto_pause_enabled
    const [raffleResult] = await connection.execute(
      `INSERT INTO raffles (
        name, description, image_url, total_tickets, price_bs, price_usd,
        min_purchase, max_purchase, draw_date, percentage_mode,
        activation_percentage, days_for_draw, status, auto_pause_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        image_url,
        parseInt(total_tickets),
        parseFloat(price_bs),
        parseFloat(price_usd),
        parseInt(min_purchase),
        parseInt(max_purchase),
        draw_date || null,
        Boolean(percentage_mode),
        activation_percentage ? parseInt(activation_percentage) : null,
        days_for_draw ? parseInt(days_for_draw) : null,
        status,
        Boolean(auto_pause_enabled),
      ]
    );

    const raffleId = raffleResult.insertId;
    console.log("✅ Rifa creada con ID:", raffleId);

    // Crear tickets con números aleatorios de 0000-9999
    const totalTicketsNum = parseInt(total_tickets);
    if (totalTicketsNum > 0) {
      console.log(
        "🎫 Generando",
        totalTicketsNum,
        "tickets aleatorios (0000-9999)..."
      );

      // Generar números aleatorios únicos entre 0000 y 9999
      const availableNumbers = [];
      for (let i = 0; i <= 9999; i++) {
        availableNumbers.push(String(i).padStart(4, "0"));
      }

      // Validar que no se soliciten más tickets de los posibles (máximo 10000)
      if (totalTicketsNum > 10000) {
        await connection.rollback();
        return res.status(400).json({
          error: "No se pueden crear más de 10,000 tickets (rango 0000-9999)",
        });
      }

      // Shuffle Fisher-Yates para seleccionar números aleatorios
      for (let i = availableNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableNumbers[i], availableNumbers[j]] = [
          availableNumbers[j],
          availableNumbers[i],
        ];
      }

      // Tomar los primeros N números después del shuffle
      const selectedNumbers = availableNumbers.slice(0, totalTicketsNum);

      console.log(
        "🎲 Números seleccionados (muestra):",
        selectedNumbers.slice(0, 10),
        "..."
      );

      // Insertar tickets en lotes
      const batchSize = 500;

      for (let i = 0; i < selectedNumbers.length; i += batchSize) {
        const batch = selectedNumbers.slice(i, i + batchSize);

        const values = [];
        const placeholders = [];

        for (const ticketNumber of batch) {
          values.push(raffleId, ticketNumber, "available");
          placeholders.push("(?, ?, ?)");
        }

        const sql = `INSERT INTO tickets (raffle_id, ticket_number, status) VALUES ${placeholders.join(", ")}`;

        console.log(
          `🎫 Insertando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(selectedNumbers.length / batchSize)}...`
        );
        await connection.execute(sql, values);
      }

      console.log("✅ Todos los tickets aleatorios creados");
    }

    // Crear premios
    if (Array.isArray(prizes) && prizes.length > 0) {
      console.log("🏆 Creando premios...");
      for (let i = 0; i < prizes.length; i++) {
        const prize = prizes[i];
        if (prize.name && prize.name.trim()) {
          // Verificar si hay imagen para este premio
          let prizeImageUrl = prize.image_url || "";

          // Buscar imagen correspondiente en los archivos subidos
          const prizeImageField = `prize_image_${i}`;
          if (
            req.files &&
            req.files[prizeImageField] &&
            req.files[prizeImageField][0]
          ) {
            prizeImageUrl = `/uploads/prizes/${req.files[prizeImageField][0].filename}`;
            console.log(
              `🖼️ Imagen del premio ${i + 1} guardada:`,
              prizeImageUrl
            );
          }

          await connection.execute(
            "INSERT INTO prizes (raffle_id, name, description, image_url, position) VALUES (?, ?, ?, ?, ?)",
            [
              raffleId,
              prize.name.trim(),
              prize.description || "",
              prizeImageUrl,
              i + 1,
            ]
          );
        }
      }
      console.log("✅ Premios creados");
    }

    // Crear métodos de pago
    if (Array.isArray(payment_methods) && payment_methods.length > 0) {
      console.log("💳 Creando métodos de pago...");
      for (const method of payment_methods) {
        if (method.type && method.info) {
          await connection.execute(
            "INSERT INTO payment_methods (raffle_id, method_type, account_info, is_active, min_tickets) VALUES (?, ?, ?, ?, ?)",
            [raffleId, method.type, JSON.stringify(method.info), true, method.min_tickets || null]
          );
        }
      }
      console.log("✅ Métodos de pago creados");
    }

    await connection.commit();
    console.log("✅ Transacción completada exitosamente");

    return res.status(201).json({
      message: "Rifa creada exitosamente",
      raffleId: raffleId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("💥 Error al crear rifa:", error);
    return res
      .status(500)
      .json({ error: "Error interno del servidor: " + error.message });
  } finally {
    connection.release();
  }
};

const updateRaffle = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validar que el ID sea un número
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "ID de rifa inválido" });
    }

    const raffleId = parseInt(id);

    console.log("📝 Datos recibidos para actualizar rifa:", updateData);
    console.log("📁 Archivos recibidos:", req.files);

    await connection.beginTransaction();

    // imagen principal
    if (req.files && req.files.image && req.files.image[0]) {
      updateData.image_url = `/uploads/raffles/${req.files.image[0].filename}`;
      console.log("🖼️ Nueva imagen principal:", updateData.image_url);
    }

    const fieldsToUpdate = [];
    const values = [];

    // Campos permitidos para actualizar
    const allowedFields = [
      "name",
      "description",
      "image_url",
      "price_bs",
      "price_usd",
      "min_purchase",
      "max_purchase",
      "draw_date",
      "percentage_mode",
      "activation_percentage",
      "days_for_draw",
      "status",
      "auto_pause_enabled",
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        fieldsToUpdate.push(`${field} = ?`);

        // Convertir tipos
        if (["price_bs", "price_usd"].includes(field)) {
          values.push(parseFloat(updateData[field]));
        } else if (
          [
            "min_purchase",
            "max_purchase",
            "activation_percentage",
            "days_for_draw",
          ].includes(field)
        ) {
          values.push(updateData[field] ? parseInt(updateData[field]) : null);
        } else if (["percentage_mode", "auto_pause_enabled"].includes(field)) {
          values.push(Boolean(updateData[field]));
        } else {
          values.push(updateData[field]);
        }
      }
    }

    if (fieldsToUpdate.length > 0) {
      values.push(raffleId);

      const [result] = await connection.execute(
        `UPDATE raffles SET ${fieldsToUpdate.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Rifa no encontrada" });
      }
    }

    // Manejar actualización de premios
    if (updateData.prizes) {
      let prizes = [];
      try {
        prizes =
          typeof updateData.prizes === "string"
            ? JSON.parse(updateData.prizes)
            : updateData.prizes;
      } catch (parseError) {
        await connection.rollback();
        return res.status(400).json({ error: "Error al parsear premios" });
      }

      // Eliminar premios existentes
      await connection.execute("DELETE FROM prizes WHERE raffle_id = ?", [
        raffleId,
      ]);

      // Insertar nuevos premios con sus imágenes
      if (Array.isArray(prizes) && prizes.length > 0) {
        console.log("🏆 Actualizando premios...");
        for (let i = 0; i < prizes.length; i++) {
          const prize = prizes[i];
          if (prize.name && prize.name.trim()) {
            let prizeImageUrl = "";

            // Verificar si hay nueva imagen para este premio
            const prizeImageField = `prize_image_${i}`;
            if (
              req.files &&
              req.files[prizeImageField] &&
              req.files[prizeImageField][0]
            ) {
              prizeImageUrl = `/uploads/prizes/${req.files[prizeImageField][0].filename}`;
              console.log(
                `🖼️ Nueva imagen del premio ${i + 1}:`,
                prizeImageUrl
              );
            } else if (prize.keep_existing_image && prize.image_url) {
              // Mantener imagen existente si se especifica
              prizeImageUrl = prize.image_url;
              console.log(
                `🔄 Manteniendo imagen existente del premio ${i + 1}:`,
                prizeImageUrl
              );
            }

            await connection.execute(
              "INSERT INTO prizes (raffle_id, name, description, image_url, position) VALUES (?, ?, ?, ?, ?)",
              [
                raffleId,
                prize.name.trim(),
                prize.description || "",
                prizeImageUrl,
                i + 1,
              ]
            );
          }
        }
        console.log("✅ Premios actualizados");
      }
    }

    // actualización de métodos de pago
    if (updateData.payment_methods) {
      let paymentMethods = [];
      try {
        paymentMethods =
          typeof updateData.payment_methods === "string"
            ? JSON.parse(updateData.payment_methods)
            : updateData.payment_methods;
      } catch (parseError) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "Error al parsear métodos de pago" });
      }

      // Eliminar métodos de pago existentes
      await connection.execute(
        "DELETE FROM payment_methods WHERE raffle_id = ?",
        [raffleId]
      );

      // Insertar nuevos métodos de pago
      if (Array.isArray(paymentMethods) && paymentMethods.length > 0) {
        console.log("💳 Actualizando métodos de pago...");
        for (const method of paymentMethods) {
          if (method.type && method.info) {
            await connection.execute(
              "INSERT INTO payment_methods (raffle_id, method_type, account_info, is_active, min_tickets) VALUES (?, ?, ?, ?, ?)",
              [raffleId, method.type, JSON.stringify(method.info), true, method.min_tickets || null]
            );
          }
        }
        console.log("✅ Métodos de pago actualizados");
      }
    }

    await connection.commit();

    return res.json({
      message: "Rifa actualizada exitosamente",
      raffleId: raffleId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("💥 Error al actualizar rifa:", error);

    // Manejar errores específicos
    if (error.code === "ER_DATA_TOO_LONG") {
      return res.status(400).json({
        error: "Uno de los campos contiene demasiados caracteres",
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Ya existe una rifa con ese nombre",
      });
    }

    return res.status(500).json({
      error: "Error interno del servidor: " + error.message,
    });
  } finally {
    connection.release();
  }
};

const deleteRaffle = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    // Validar que el ID sea un número
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "ID de rifa inválido" });
    }

    const raffleId = parseInt(id);

    await connection.beginTransaction();

    // Verificar que la rifa existe
    const [raffleRows] = await connection.execute(
      "SELECT name FROM raffles WHERE id = ?",
      [raffleId]
    );

    if (raffleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Rifa no encontrada" });
    }

    const raffleName = raffleRows[0].name;

    //  si tiene compras/pagos registrados
    const [purchaseRows] = await connection.execute(
      "SELECT COUNT(*) as purchase_count FROM purchases WHERE raffle_id = ?",
      [raffleId]
    );

    const purchaseCount = purchaseRows[0].purchase_count;

    if (purchaseCount > 0) {
      await connection.rollback();
      return res.status(400).json({
        error: `No se puede eliminar la rifa "${raffleName}" porque tiene ${purchaseCount} compras registradas. Para eliminar una rifa, primero debe cancelar todas las compras asociadas.`,
      });
    }

    const [result] = await connection.execute(
      "DELETE FROM raffles WHERE id = ?",
      [raffleId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Rifa no encontrada" });
    }

    await connection.commit();
    console.log(`✅ Rifa "${raffleName}" eliminada exitosamente`);

    return res.json({
      message: `Rifa "${raffleName}" eliminada exitosamente`,
      deletedRaffleId: raffleId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("💥 Error al eliminar rifa:", error);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({
        error:
          "No se puede eliminar la rifa porque tiene compras o datos asociados. Elimine primero las compras relacionadas.",
      });
    }

    return res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

const getDashboardStats = async (req, res) => {
  try {
    // Estadísticas generales de rifas
    const [raffleStats] = await db.execute(`
      SELECT 
        COUNT(*) AS total_raffles,
        COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_raffles,
        COUNT(CASE WHEN status = 'finished' THEN 1 END) AS finished_raffles
      FROM raffles
    `);

    // Estadísticas de tickets
    const [ticketStats] = await db.execute(`
      SELECT
      COUNT(t.id) AS total_tickets,
      COUNT(CASE WHEN t.status = 'sold' THEN 1 END) AS sold_tickets,
      COUNT(CASE WHEN t.status = 'reserved' THEN 1 END) AS reserved_tickets
    FROM tickets AS t
    JOIN raffles AS r
      ON t.raffle_id = r.id
    WHERE
      r.status = 'active'
    `);

    // Estadísticas de ventas
    const [salesStats] = await db.execute(`
      SELECT 
        COUNT(*) AS total_sales,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_sales,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_sales,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) AS total_revenue
      FROM purchases
    `);

    // Estadísticas de usuarios
    const [userStats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT customer_phone) AS total_customers,
        COUNT(DISTINCT CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN customer_phone END) AS new_customers
      FROM purchases
    `);

    // Ventas recientes
    const [recentSales] = await db.execute(`
      SELECT p.*, r.name AS raffle_name
      FROM purchases p
      JOIN raffles r ON p.raffle_id = r.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    return res.json({
      raffles: raffleStats[0] || {
        total_raffles: 0,
        active_raffles: 0,
        finished_raffles: 0,
      },
      tickets: ticketStats[0] || {
        total_tickets: 0,
        sold_tickets: 0,
        reserved_tickets: 0,
      },
      sales: salesStats[0] || {
        total_sales: 0,
        pending_sales: 0,
        approved_sales: 0,
        total_revenue: 0,
      },
      users: userStats[0] || { total_customers: 0, new_customers: 0 },
      recent_sales: recentSales || [],
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

//Pausar rifa manualmente
const pauseRaffle = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body;

    const result = await pauseService.pauseRaffleManually(
      parseInt(id),
      duration ? parseInt(duration) : null
    );

    if (result.success) {
      res.json({
        message: result.message,
        paused: true,
        pauseUntil: result.pauseUntil,
        reason: result.reason,
      });
    } else {
      res.status(400).json({
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error al pausar rifa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// reactivar rifa pausada
const unpauseRaffle = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`▶️ Reactivando rifa ${id} manualmente...`);

    const result = await pauseService.unpauseRaffle(parseInt(id));

    if (result.success) {
      res.json({
        message: result.message,
        newStatus: result.newStatus,
        availability: result.availability,
      });
    } else {
      res.status(400).json({
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error al reactivar rifa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// información de pausa
const getPauseInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const pauseInfo = await pauseService.getPauseInfo(parseInt(id));
    const availability = await pauseService.checkTicketAvailability(
      parseInt(id)
    );

    if (!pauseInfo) {
      return res.status(404).json({ error: "Rifa no encontrada" });
    }

    res.json({
      ...pauseInfo,
      availability,
    });
  } catch (error) {
    console.error("Error al obtener información de pausa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// alternar pausa automática
const toggleAutoPause = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const [result] = await db.execute(
      "UPDATE raffles SET auto_pause_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [Boolean(enabled), parseInt(id)]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Rifa no encontrada" });
    }

    console.log(
      `🔄 Pausa automática ${enabled ? "habilitada" : "deshabilitada"} para rifa ${id}`
    );

    res.json({
      message: `Pausa automática ${enabled ? "habilitada" : "deshabilitada"} exitosamente`,
      autoPauseEnabled: Boolean(enabled),
    });
  } catch (error) {
    console.error("Error al alternar pausa automática:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// publicar rifa
const publishRaffle = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const publishData = req.body;

    const allowedStatus = ["finished"];
    const allowedFields = ["publish"];
    const fieldsToUpdate = [];
    const values = [];

    // Validar que el ID sea un número
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "ID de rifa inválido" });
    }

    const raffleId = parseInt(id);

    console.log("📝 Datos recibidos para actualizar rifa:", publishData);

    // Obtener datos de la rifa
    const [raffleRows] = await db.execute(
      `SELECT r.id, r.status, r.publish
       FROM raffles r
       WHERE r.id = ?`,
      [raffleId]
    );

    if (raffleRows.length === 0) {
      return res.status(404).json({ error: `Rifa no encontrada` });
    }
    const raffle = raffleRows[0];

    // Validar que la rifa tenga el estatus correcto para publicar
    if (!allowedStatus.includes(raffle.status)) {
      return res.status(404).json({
        error: `La rifa no tiene el estatus correcto (${allowedStatus})`,
      });
    }

    await connection.beginTransaction();

    for (const field of allowedFields) {
      if (publishData[field] !== undefined) {
        fieldsToUpdate.push(`${field} = ?`);

        // Convertir tipos
        if (["publish"].includes(field)) {
          values.push(Boolean(publishData[field]));
        }
        //  else {
        //   values.push(publishData[field]);
        // }
      }
    }

    if (fieldsToUpdate.length > 0) {
      if (raffle.publish && publishData.publish) {
        await connection.rollback();
        return res.json({
          message: "La rifa ya está publicada",
          raffleId: raffleId,
        });
      }

      if (!raffle.publish && !publishData.publish) {
        await connection.rollback();
        return res.json({
          message: "La rifa no está publicada",
          raffleId: raffleId,
        });
      }

      values.push(raffleId);

      const [result] = await connection.execute(
        `UPDATE raffles SET ${fieldsToUpdate.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ? and status IN ('${allowedStatus.join("', '")}')`,
        values
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Rifa no publicada" });
      }
    }

    await connection.commit();

    return res.json({
      message: `Rifa ${publishData.publish ? "" : "des"}publicada exitosamente`,
      raffleId: raffleId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("💥 Error al actualizar rifa:", error);

    // Manejar errores específicos
    if (error.code === "ER_DATA_TOO_LONG") {
      return res.status(400).json({
        error: "Uno de los campos contiene demasiados caracteres",
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Ya existe una rifa con ese nombre",
      });
    }

    return res.status(500).json({
      error: "Error interno del servidor: " + error.message,
    });
  } finally {
    connection.release();
  }
};

// consultar rifas publicadas
const getPublishRaffles = async (req, res) => {
  console.log("🔍 Consultando rifas publicadas...");
  try {
    //Extraer y arreglar los parámetros de consulta
    let { limit, page } = req.query;

    const publishRaffleStatus = ["finished"];

    // Construir la consulta base/
    let query = `
      SELECT r.*,
             COUNT(DISTINCT p.id) AS total_prizes,
             COUNT(DISTINCT CASE WHEN t.status = 'sold' THEN t.id END) AS total_tickets_sold,
             (SELECT COUNT(*) FROM tickets WHERE raffle_id = r.id AND status = 'available') AS available_tickets
      FROM raffles r
      LEFT JOIN prizes p ON r.id = p.raffle_id
      LEFT JOIN tickets t ON r.id = t.raffle_id
      WHERE r.publish = true
      and r.status IN ('${publishRaffleStatus.join(", ")}')
    `;

    // Array para los parámetros de la consulta
    const params = [];

    query += " GROUP BY r.id ORDER BY r.created_at DESC";

    // paginación
    if (limit && limit !== "all") {
      const parsedLimit = parseInt(limit, 10);
      const parsedPage = parseInt(page, 10);

      // Asegurar valores válidos
      const safeLimitNum =
        !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
      const safePageNum = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const offset = (safePageNum - 1) * safeLimitNum;

      query += ` LIMIT ${safeLimitNum} OFFSET ${offset}`;
    }

    // Ejecutar
    let [rows] = await db.execute(query, params);

    // Calcular estadísticas adicionales
    const rafflesWithStats = rows.map((raffle) => {
      const totalTickets = raffle.total_tickets || 0;
      const sold = raffle.total_tickets_sold || 0;
      const soldPct =
        totalTickets > 0 ? ((sold / totalTickets) * 100).toFixed(2) : "0.00";

      let daysRemaining = null;
      if (raffle.draw_date) {
        const today = new Date();
        const drawDate = new Date(raffle.draw_date);
        const diffMs = drawDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        ...raffle,
        sold_percentage: soldPct,
        days_remaining: daysRemaining,
      };
    });

    let queryTotalRows = `
      SELECT
        COUNT(DISTINCT r.id) total
      FROM raffles r
      LEFT JOIN prizes p ON r.id = p.raffle_id
      LEFT JOIN tickets t ON r.id = t.raffle_id
      WHERE r.publish = true
      and r.status IN ('${publishRaffleStatus.join(", ")}')
    `;

    const [totalRows] = await db.execute(queryTotalRows, []);
    console.log("Total rows query:", totalRows);
    // rafflesWithStats.totalRows = totalRows.total;

    return res.json({
      raffles: rafflesWithStats,
      totalRows: totalRows[0].total,
    });
  } catch (error) {
    console.error("Error al obtener rifas:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = {
  getAllRaffles,
  getRaffleById,
  createRaffle,
  updateRaffle,
  deleteRaffle,
  getDashboardStats,
  pauseRaffle,
  unpauseRaffle,
  getPauseInfo,
  toggleAutoPause,
  publishRaffle,
  getPublishRaffles,
  getFirstActiveRaffleDetails
};
