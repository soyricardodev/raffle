const express = require('express');
const {
  getTicketsByRaffle,
  verifyTicket,
  getAvailableTickets,
  getTicketStats,
  advancedSearch
} = require('../controllers/ticketController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Rutas públicas
router.post('/verify', verifyTicket);
router.get('/raffle/:raffleId/available', getAvailableTickets);
router.get('/search', advancedSearch);

// Rutas protegidas
router.get('/raffle/:raffleId', authenticateToken, getTicketsByRaffle);
router.get('/raffle/:raffleId/stats', authenticateToken, getTicketStats);

module.exports = router;