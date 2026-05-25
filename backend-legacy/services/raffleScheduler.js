const db = require('../config/database');
const cron = require('node-cron');

/**
 * Servicio para finalizar automáticamente las rifas vencidas
 */
class RaffleScheduler {
    constructor() {
        this.isRunning = false;
    }

    /**
     * Finaliza rifas que han pasado su fecha de sorteo
     */
    async finalizeExpiredRaffles() {
        const connection = await db.getConnection();

        try {

            // Buscar rifas activas que ya pasaron su fecha de sorteo
            const [expiredRaffles] = await connection.execute(`
        SELECT id, name, draw_date, status 
        FROM raffles 
        WHERE status = 'active' 
        AND draw_date IS NOT NULL 
        AND draw_date <= DATE_SUB(NOW(), INTERVAL 4 HOUR)
      `);

            if (expiredRaffles.length === 0) {
                return { success: true, finalized: 0 };
            }

            console.log(`📅 Encontradas ${expiredRaffles.length} rifas vencidas:`,
                expiredRaffles.map(r => `${r.name} (${r.draw_date})`));

            // Finalizar rifas vencidas
            const raffleIds = expiredRaffles.map(r => r.id);
            const placeholders = raffleIds.map(() => '?').join(',');

            const [updateResult] = await connection.execute(`
        UPDATE raffles 
        SET status = 'finished', updated_at = CURRENT_TIMESTAMP 
        WHERE id IN (${placeholders})
      `, raffleIds);


            // Log detallado de cada rifa finalizada
            for (const raffle of expiredRaffles) {
                console.log(`🏁 Rifa finalizada: "${raffle.name}" (ID: ${raffle.id}) - Fecha: ${raffle.draw_date}`);
            }

            return {
                success: true,
                finalized: updateResult.affectedRows,
                raffles: expiredRaffles
            };

        } catch (error) {
            console.error('❌ Error al finalizar rifas vencidas:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            connection.release();
        }
    }

    /**
     * Ejecuta mantenimiento completo
     */
    async runMaintenance() {
        if (this.isRunning) {
            console.log('⏳ Mantenimiento ya en ejecución, saltando...');
            return;
        }

        this.isRunning = true;

        try {

            // Finalizar rifas vencidas
            const raffleResult = await this.finalizeExpiredRaffles();

            console.log('✅ Mantenimiento completado:', {
                rifas_finalizadas: raffleResult.finalized || 0
            });

            return {
                success: true,
                raffles_finalized: raffleResult.finalized || 0
            };

        } catch (error) {
            console.error('💥 Error en mantenimiento automático:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Inicia el scheduler con cron jobs
     */
    start() {
        console.log('🚀 Iniciando RaffleScheduler...');

        // Ejecutar cada 5 minutos para verificar rifas vencidas
        const raffleTask = cron.schedule('*/5 * * * *', async () => {
            await this.runMaintenance();
        }, {
            scheduled: false,
            timezone: "America/Caracas"
        });

        // Iniciar la tarea
        raffleTask.start();

        console.log('✅ RaffleScheduler iniciado:');
        console.log('   📅 Verificación de rifas vencidas: cada 5 minutos');

        // Ejecutar una vez al iniciar para limpiar estado
        setTimeout(() => {
            this.runMaintenance();
        }, 2000);

        return {
            raffleTask
        };
    }

    /**
     * Método manual para ejecutar desde endpoint
     */
    async runManual() {
        console.log('🔧 Ejecutando mantenimiento manual...');
        return await this.runMaintenance();
    }
}

const raffleScheduler = new RaffleScheduler();

module.exports = raffleScheduler;