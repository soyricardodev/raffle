const express = require('express');
const raffleScheduler = require('../services/raffleScheduler');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/maintenance/status
 * Obtener estado del sistema de mantenimiento
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        res.json({
            scheduler_running: true,
            message: 'Sistema de mantenimiento automático activo',
            intervals: {
                raffle_check: 'Cada 5 minutos'
            },
            timezone: 'America/Caracas',
            last_check: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error al obtener estado de mantenimiento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * POST /api/maintenance/run
 * Ejecutar mantenimiento manual
 */
router.post('/run', authenticateToken, async (req, res) => {
    try {
        console.log('🔧 Ejecutando mantenimiento manual solicitado por admin...');

        const result = await raffleScheduler.runManual();

        if (result.success) {
            res.json({
                message: 'Mantenimiento ejecutado exitosamente',
                results: {
                    rifas_finalizadas: result.raffles_finalized,
                    rifas_procesadas_pausa: result.pause_processed || 0,
                    rifas_reactivadas: result.pause_reactivated || 0,
                    rifas_finalizadas_por_pausa: result.pause_finished || 0
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                error: 'Error durante el mantenimiento',
                details: result.error,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error al ejecutar mantenimiento manual:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/maintenance/finalize-raffles
 * Finalizar solo rifas vencidas
 */
router.post('/finalize-raffles', authenticateToken, async (req, res) => {
    try {
        console.log('🏁 Finalizando rifas vencidas solicitado por admin...');

        const result = await raffleScheduler.finalizeExpiredRaffles();

        if (result.success) {
            res.json({
                message: result.finalized > 0
                    ? `${result.finalized} rifas finalizadas exitosamente`
                    : 'No hay rifas vencidas para finalizar',
                finalized_count: result.finalized,
                raffles: result.raffles || [],
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                error: 'Error al finalizar rifas',
                details: result.error,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error al finalizar rifas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;