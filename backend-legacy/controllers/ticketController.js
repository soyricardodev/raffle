const db = require('../config/database');
const pauseService = require('../services/pauseService');

const getTicketsByRaffle = async (req, res) => {
  try {
    const { raffleId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT t.*, p.customer_name, p.customer_phone, p.customer_email, p.customer_ci, p.status as purchase_status
      FROM tickets t
      LEFT JOIN purchases p ON t.purchase_id = p.id
      WHERE t.raffle_id = ?
    `;

    const params = [raffleId];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY CAST(t.ticket_number AS UNSIGNED)';

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const verifyTicket = async (req, res) => {
  try {
    const { phone, ticketNumber, cedula, email } = req.body;

    console.log('🔍 Parámetros de búsqueda recibidos:', { phone, ticketNumber, cedula, email });

    // Construir la query dinámicamente según los parámetros recibidos
    let whereConditions = [];
    let params = [];

    // Búsqueda por teléfono
    if (phone && phone.trim()) {
      whereConditions.push('p.customer_phone = ?');
      params.push(phone.trim());
      console.log('📞 Buscando por teléfono:', phone.trim());
    }

    // Búsqueda por número de boleto
    if (ticketNumber && ticketNumber.trim()) {
      whereConditions.push('t.ticket_number = ?');
      params.push(ticketNumber.trim());
      console.log('🎫 Buscando por ticket:', ticketNumber.trim());
    }

    // Búsqueda por cédula usando customer_ci
    if (cedula && cedula.trim()) {
      // remover espacios, puntos, guiones y letras de la cédula
      const normalizedCedula = cedula.trim().replace(/[\s\-\.VEve]/g, '');
      console.log('🆔 Buscando por cédula:', cedula.trim(), '-> normalizada:', normalizedCedula);

      // Buscar tanto en formato original
      whereConditions.push('(REPLACE(REPLACE(REPLACE(UPPER(p.customer_ci), "V", ""), "E", ""), "-", "") = ? OR p.customer_ci = ?)');
      params.push(normalizedCedula, cedula.trim());
    }

    // Búsqueda por email
    if (email && email.trim()) {
      whereConditions.push('LOWER(p.customer_email) = LOWER(?)');
      params.push(email.trim());
      console.log('📧 Buscando por email:', email.trim());
    }

    if (whereConditions.length === 0) {
      return res.status(400).json({
        error: 'Debe proporcionar al menos un criterio de búsqueda (teléfono, número de boleto, cédula o email)'
      });
    }

    const query = `
      SELECT 
        t.*, 
        r.name as raffle_name, 
        r.draw_date, 
        p.customer_name, 
        p.customer_phone,
        p.customer_email,
        p.customer_ci as customer_cedula,
        p.status as purchase_status
      FROM tickets t
      JOIN raffles r ON t.raffle_id = r.id
      LEFT JOIN purchases p ON t.purchase_id = p.id
      WHERE (${whereConditions.join(' OR ')})
      AND t.status IN ('sold', 'reserved')
      and r.status in ('active','paused')
      ORDER BY CAST(t.ticket_number AS UNSIGNED), r.name
    `;

    console.log('🔍 Query SQL:', query);
    console.log('📋 Parámetros:', params);

    const [rows] = await db.execute(query, params);

    console.log(`✅ Encontrados ${rows.length} tickets`);

    res.json(rows);
  } catch (error) {
    console.error('❌ Error al verificar ticket:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getAvailableTickets = async (req, res) => {
  try {
    const { raffleId } = req.params;
    const { quantity } = req.query;

    // Validar raffleId
    const raffleIdNum = parseInt(raffleId);
    if (isNaN(raffleIdNum) || raffleIdNum <= 0) {
      return res.status(400).json({ error: 'ID de rifa inválido' });
    }

    //  obtener tickets aleatorios disponibles
    const query = `
      SELECT ticket_number 
      FROM tickets 
      WHERE raffle_id = ? AND status = 'available' 
      ORDER BY RAND()
    `;

    const [rows] = await db.execute(query, [raffleIdNum]);
    let result = rows.map(row => row.ticket_number);

    if (quantity) {
      const quantityNum = parseInt(quantity);
      if (!isNaN(quantityNum) && quantityNum > 0) {
        result = result.slice(0, quantityNum);
        console.log(`Aplicando límite de ${quantityNum} tickets`);
      }
    }

    console.log(`Devolviendo ${result.length} tickets disponibles (aleatorios)`);
    res.json(result);
  } catch (error) {
    console.error('Error al obtener tickets disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de tickets
const getTicketStats = async (req, res) => {
  try {
    const { raffleId } = req.params;

    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_tickets,
        COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved_tickets,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_tickets,
        MIN(CAST(ticket_number AS UNSIGNED)) as min_number,
        MAX(CAST(ticket_number AS UNSIGNED)) as max_number
      FROM tickets 
      WHERE raffle_id = ?
    `, [raffleId]);

    if (stats.length > 0) {
      const result = stats[0];
      result.sold_percentage = result.total_tickets > 0
        ? ((result.sold_tickets / result.total_tickets) * 100).toFixed(2)
        : '0.00';

      res.json(result);
    } else {
      res.json({
        total_tickets: 0,
        available_tickets: 0,
        reserved_tickets: 0,
        sold_tickets: 0,
        sold_percentage: '0.00',
        min_number: null,
        max_number: null
      });
    }
  } catch (error) {
    console.error('Error al obtener estadísticas de tickets:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  Búsqueda de tickets
const advancedSearch = async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      customer_ci,
      raffle_id,
      status,
      date_from,
      date_to
    } = req.query;

    let whereConditions = ['1=1'];
    let params = [];

    // Filtros dinámicos
    if (customer_name && customer_name.trim()) {
      whereConditions.push('p.customer_name LIKE ?');
      params.push(`%${customer_name.trim()}%`);
    }

    if (customer_phone && customer_phone.trim()) {
      whereConditions.push('p.customer_phone LIKE ?');
      params.push(`%${customer_phone.trim()}%`);
    }

    if (customer_email && customer_email.trim()) {
      whereConditions.push('LOWER(p.customer_email) LIKE LOWER(?)');
      params.push(`%${customer_email.trim()}%`);
    }

    if (customer_ci && customer_ci.trim()) {
      const normalizedCedula = customer_ci.trim().replace(/[\s\-\.VEve]/g, '');
      whereConditions.push('REPLACE(REPLACE(REPLACE(UPPER(p.customer_ci), "V", ""), "E", ""), "-", "") LIKE ?');
      params.push(`%${normalizedCedula}%`);
    }

    if (raffle_id) {
      whereConditions.push('t.raffle_id = ?');
      params.push(raffle_id);
    }

    if (status) {
      whereConditions.push('t.status = ?');
      params.push(status);
    }

    if (date_from) {
      whereConditions.push('DATE(p.created_at) >= ?');
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push('DATE(p.created_at) <= ?');
      params.push(date_to);
    }

    const query = `
      SELECT 
        t.*, 
        r.name as raffle_name, 
        r.draw_date, 
        p.customer_name, 
        p.customer_phone,
        p.customer_email,
        p.customer_ci as customer_cedula,
        p.status as purchase_status,
        p.created_at as purchase_date
      FROM tickets t
      JOIN raffles r ON t.raffle_id = r.id
      LEFT JOIN purchases p ON t.purchase_id = p.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY p.created_at DESC, CAST(t.ticket_number AS UNSIGNED)
      LIMIT 1000
    `;


    const [rows] = await db.execute(query, params);

    res.json({
      tickets: rows,
      total: rows.length,
      query_info: {
        conditions: whereConditions.length - 1,
        limited: rows.length === 1000
      }
    });
  } catch (error) {
    console.error('❌ Error en búsqueda avanzada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getTicketsByRaffle,
  verifyTicket,
  getAvailableTickets,
  getTicketStats,
  advancedSearch
};