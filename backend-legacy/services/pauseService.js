const db = require('../config/database');

/**
 * Servicio para manejar pausas automáticas y manuales de rifas
 */
class PauseService {
    constructor() {
        this.PAUSE_DURATION_MINUTES = 15;
    }

    /**
     * Verificar disponibilidad de tickets para una rifa
     */
    async checkTicketAvailability(raffleId) {
        const connection = await db.getConnection();

        try {
            const [stats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_tickets,
                    COUNT(CASE WHEN status = 'available' THEN 1 END) as available_tickets,
                    COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_tickets,
                    COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved_tickets
                FROM tickets 
                WHERE raffle_id = ?
            `, [raffleId]);

            if (stats.length === 0) {
                return {
                    total: 0,
                    available: 0,
                    sold: 0,
                    reserved: 0,
                    unavailable: 0,
                    isFull: false
                };
            }

            const result = stats[0];
            const unavailable = result.sold_tickets + result.reserved_tickets;
            const isFull = unavailable >= result.total_tickets;

            return {
                total: result.total_tickets,
                available: result.available_tickets,
                sold: result.sold_tickets,
                reserved: result.reserved_tickets,
                unavailable,
                isFull
            };
        } finally {
            connection.release();
        }
    }

    /**
     * Verificar si una rifa necesita pausa automática - Sin Boletos - o mneor al mínimo
     */
    async checkAutoPause(raffleId) {
        const connection = await db.getConnection();

        try {
            // Verificar estado actual de la rifa (para ver Sin Boletos - o mneor al mínimo)
            const [raffleRows] = await connection.execute(
                'SELECT id, name, status, auto_pause_enabled, min_purchase FROM raffles WHERE id = ? AND status = "active"',
                [raffleId]
            );

            if (raffleRows.length === 0) {
                return { needsPause: false, reason: 'Rifa no activa o no encontrada' };
            }

            const raffle = raffleRows[0];

            // Si la pausa automática está deshabilitada
            if (!raffle.auto_pause_enabled) {
                return { needsPause: false, reason: 'Pausa automática deshabilitada' };
            }

            // Verificar disponibilidad de tickets
            const availability = await this.checkTicketAvailability(raffleId);

            console.log(`🔍 Verificando pausa automática para rifa ${raffleId}:`, availability);
            console.log(`📊 Compra mínima requerida: ${raffle.min_purchase}`);

            // Todos los tickets están vendidos o reservados
            if (availability.isFull) {
                return {
                    needsPause: true,
                    reason: 'Todos los tickets están vendidos o reservados',
                    pauseType: 'auto_full',
                    availability,
                    minPurchase: raffle.min_purchase
                };
            }

            // tickets insuficientes para compra mínima
            if (availability.available < raffle.min_purchase) {
                return {
                    needsPause: true,
                    reason: `Tickets insuficientes para compra mínima (disponibles: ${availability.available}, mínimo: ${raffle.min_purchase})`,
                    pauseType: 'auto_insufficient',
                    availability,
                    minPurchase: raffle.min_purchase
                };
            }

            return {
                needsPause: false,
                reason: 'Tickets disponibles suficientes',
                availability,
                minPurchase: raffle.min_purchase
            };
        } finally {
            connection.release();
        }
    }

    /**
     * Pausar una rifa automáticamente
     */
    async pauseRaffle(raffleId, reason = 'auto_full') {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const pauseUntil = new Date();
            pauseUntil.setMinutes(pauseUntil.getMinutes() + this.PAUSE_DURATION_MINUTES);

            const [result] = await connection.execute(`
                UPDATE raffles 
                SET status = 'paused', 
                    pause_until = ?, 
                    pause_reason = ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND status = 'active'
            `, [pauseUntil, reason, raffleId]);

            if (result.affectedRows === 0) {
                await connection.rollback();
                return {
                    success: false,
                    error: 'No se pudo pausar la rifa (posiblemente ya no está activa)'
                };
            }

            await connection.commit();

            // Mensaje según el tipo de pausa
            let pauseMessage = `Rifa pausada por ${this.PAUSE_DURATION_MINUTES} minutos`;
            if (reason === 'auto_insufficient') {
                pauseMessage = `Rifa pausada automáticamente: tickets insuficientes para compra mínima`;
            } else if (reason === 'auto_full') {
                pauseMessage = `Rifa pausada automáticamente: todos los tickets están ocupados`;
            }

            console.log(`⏸️ Rifa ${raffleId} pausada automáticamente (${reason}) hasta ${pauseUntil.toISOString()}`);

            return {
                success: true,
                pauseUntil,
                reason,
                message: pauseMessage
            };
        } catch (error) {
            await connection.rollback();
            console.error('❌ Error al pausar rifa:', error);
            return { success: false, error: error.message };
        } finally {
            connection.release();
        }
    }

    /**
     * Pausar una rifa manualmente
     */
    async pauseRaffleManually(raffleId, durationMinutes = null) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            let pauseUntil = null;
            if (durationMinutes) {
                pauseUntil = new Date();
                pauseUntil.setMinutes(pauseUntil.getMinutes() + durationMinutes);
            }

            const [result] = await connection.execute(`
                UPDATE raffles 
                SET status = 'paused', 
                    pause_until = ?, 
                    pause_reason = 'manual',
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND status IN ('active', 'paused')
            `, [pauseUntil, raffleId]);

            if (result.affectedRows === 0) {
                await connection.rollback();
                return {
                    success: false,
                    error: 'No se pudo pausar la rifa'
                };
            }

            await connection.commit();

            console.log(`⏸️ Rifa ${raffleId} pausada manualmente${pauseUntil ? ` hasta ${pauseUntil.toISOString()}` : ' indefinidamente'}`);

            return {
                success: true,
                pauseUntil,
                reason: 'manual',
                message: pauseUntil
                    ? `Rifa pausada hasta ${pauseUntil.toLocaleString()}`
                    : 'Rifa pausada indefinidamente'
            };
        } catch (error) {
            await connection.rollback();
            console.error('❌ Error al pausar rifa manualmente:', error);
            return { success: false, error: error.message };
        } finally {
            connection.release();
        }
    }

    /**
     * Reactivar una rifa pausada
     */
    async unpauseRaffle(raffleId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Verificar estado actual
            const [raffleRows] = await connection.execute(
                'SELECT id, name, status, pause_reason, min_purchase FROM raffles WHERE id = ? AND status = "paused"',
                [raffleId]
            );

            if (raffleRows.length === 0) {
                await connection.rollback();
                return {
                    success: false,
                    error: 'Rifa no encontrada o no está pausada'
                };
            }

            const raffle = raffleRows[0];

            //  disponibilidad antes de reactivar
            const availability = await this.checkTicketAvailability(raffleId);

            let newStatus = 'active';
            let message = 'Rifa reactivada exitosamente';

            // si puede reactivarse
            if (availability.available === 0) {
                // No hay tickets disponibles -> finalizar
                newStatus = 'finished';
                message = 'Rifa finalizada - no hay tickets disponibles';
            } else if (availability.available < raffle.min_purchase) {
                // Hay tickets pero insuficientes para compra mínima -> finalizar
                newStatus = 'finished';
                message = `Rifa finalizada - tickets insuficientes para compra mínima (disponibles: ${availability.available}, mínimo: ${raffle.min_purchase})`;
            }

            const [result] = await connection.execute(`
                UPDATE raffles 
                SET status = ?, 
                    pause_until = NULL, 
                    pause_reason = NULL,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [newStatus, raffleId]);

            await connection.commit();

            console.log(`▶️ Rifa ${raffleId} ${newStatus === 'active' ? 'reactivada' : 'finalizada'}`);

            return {
                success: true,
                newStatus,
                message,
                availability,
                minPurchase: raffle.min_purchase
            };
        } catch (error) {
            await connection.rollback();
            console.error('❌ Error al reactivar rifa:', error);
            return { success: false, error: error.message };
        } finally {
            connection.release();
        }
    }

    /**
     * Verificar y procesar rifas pausadas que ya expiraron
     */
    async processPausedRaffles() {
        const connection = await db.getConnection();

        try {

            // Buscar rifas pausadas que ya expiraron
            const [expiredRaffles] = await connection.execute(`
                SELECT id, name, pause_until, pause_reason, min_purchase 
                FROM raffles 
                WHERE status = 'paused' 
                AND pause_until IS NOT NULL 
                AND pause_until <= NOW()
            `);

            if (expiredRaffles.length === 0) {
                return { success: true, processed: 0 };
            }


            let reactivated = 0;
            let finished = 0;

            for (const raffle of expiredRaffles) {

                const result = await this.unpauseRaffle(raffle.id);

                if (result.success) {
                    if (result.newStatus === 'active') {
                        reactivated++;
                    } else if (result.newStatus === 'finished') {
                        finished++;
                    }
                }
            }

            return {
                success: true,
                processed: expiredRaffles.length,
                reactivated,
                finished
            };
        } catch (error) {
            console.error('❌ Error al procesar rifas pausadas:', error);
            return { success: false, error: error.message };
        } finally {
            connection.release();
        }
    }

    /**
     * Obtener información de pausa de una rifa
     */
    async getPauseInfo(raffleId) {
        const connection = await db.getConnection();

        try {
            const [rows] = await connection.execute(`
                SELECT status, pause_until, pause_reason, auto_pause_enabled, min_purchase
                FROM raffles 
                WHERE id = ?
            `, [raffleId]);

            if (rows.length === 0) {
                return null;
            }

            const raffle = rows[0];
            const now = new Date();

            let remainingSeconds = 0;
            if (raffle.pause_until) {
                remainingSeconds = Math.max(0, Math.floor((new Date(raffle.pause_until) - now) / 1000));
            }

            // Obtener disponibilidad actual para más contexto
            const availability = await this.checkTicketAvailability(raffleId);

            return {
                status: raffle.status,
                isPaused: raffle.status === 'paused',
                pauseUntil: raffle.pause_until,
                pauseReason: raffle.pause_reason,
                autoPauseEnabled: raffle.auto_pause_enabled,
                remainingSeconds,
                hasTimer: !!raffle.pause_until && remainingSeconds > 0,
                minPurchase: raffle.min_purchase,
                availability,
                // Información adicional sobre el motivo de la pausa
                pauseContext: this.getPauseContext(raffle.pause_reason, availability, raffle.min_purchase)
            };
        } finally {
            connection.release();
        }
    }

    /**
     * contexto explicativo de la pausa
     */
    getPauseContext(pauseReason, availability, minPurchase) {
        if (!pauseReason) return null;

        const contexts = {
            'auto_full': {
                title: 'Rifa Completa',
                description: 'Todos los boletos están vendidos o reservados',
                icon: '🎯'
            },
            'auto_insufficient': {
                title: 'Boletos Insuficientes',
                description: `Solo quedan ${availability?.available || 0} boletos disponibles, pero se necesitan al menos ${minPurchase} para realizar una compra`,
                icon: '📊'
            },
            'manual': {
                title: 'Pausa Manual',
                description: 'La rifa fue pausada manualmente por un administrador',
                icon: '👨‍💼'
            }
        };

        return contexts[pauseReason] || {
            title: 'Rifa Pausada',
            description: 'La rifa se encuentra en pausa temporalmente',
            icon: '⏸️'
        };
    }
}

const pauseService = new PauseService();

module.exports = pauseService;