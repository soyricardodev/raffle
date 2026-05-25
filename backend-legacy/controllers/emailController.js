const emailService = require('../services/emailService');

// logs de emails con filtros
const getEmailLogs = async (req, res) => {
    try {
        const {
            purchase_id,
            email_type,
            status,
            recipient_email,
            limit = 100,
            page = 1
        } = req.query;

        console.log('📋 Obteniendo logs de emails con filtros:', req.query);

        const filters = {};

        if (purchase_id) filters.purchase_id = purchase_id;
        if (email_type) filters.email_type = email_type;
        if (status) filters.status = status;
        if (recipient_email) filters.recipient_email = recipient_email;

        //  paginación si se solicita
        if (limit !== 'all') {
            const parsedLimit = parseInt(limit, 10);
            const parsedPage = parseInt(page, 10);

            const safeLimitNum = (!isNaN(parsedLimit) && parsedLimit > 0) ? parsedLimit : 100;
            const safePageNum = (!isNaN(parsedPage) && parsedPage > 0) ? parsedPage : 1;

            filters.limit = safeLimitNum;
            filters.offset = (safePageNum - 1) * safeLimitNum;
        }

        const logs = await emailService.getEmailLogs(filters);

        //  estadísticas 
        const totalLogs = logs.length;
        const sentEmails = logs.filter(log => log.status === 'sent').length;
        const failedEmails = logs.filter(log => log.status === 'failed').length;
        const pendingEmails = logs.filter(log => log.status === 'pending').length;

        const stats = {
            total: totalLogs,
            sent: sentEmails,
            failed: failedEmails,
            pending: pendingEmails,
            success_rate: totalLogs > 0 ? ((sentEmails / totalLogs) * 100).toFixed(1) : '0.0'
        };

        console.log('✅ Logs obtenidos:', totalLogs, 'emails encontrados');

        res.json({
            data: logs,
            stats: stats,
            pagination: {
                page: parseInt(page),
                limit: limit === 'all' ? 'all' : parseInt(limit),
                total: totalLogs
            }
        });

    } catch (error) {
        console.error('💥 Error obteniendo logs de emails:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener estadísticas de emails
const getEmailStats = async (req, res) => {
    try {
        console.log('📊 Obteniendo estadísticas de emails...');

        const filters = {};

        // todos los logs para estadísticas
        const allLogs = await emailService.getEmailLogs(filters);

        // Estadísticas generales
        const total = allLogs.length;
        const sent = allLogs.filter(log => log.status === 'sent').length;
        const failed = allLogs.filter(log => log.status === 'failed').length;
        const pending = allLogs.filter(log => log.status === 'pending').length;

        // Estadísticas por tipo de email
        const byType = {
            purchase_confirmation: allLogs.filter(log => log.email_type === 'purchase_confirmation').length,
            status_update: allLogs.filter(log => log.email_type === 'status_update').length,
            ticket_modification: allLogs.filter(log => log.email_type === 'ticket_modification').length
        };

        // Estadísticas por día (últimos 7 días)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayLogs = allLogs.filter(log => {
                const logDate = new Date(log.created_at).toISOString().split('T')[0];
                return logDate === dateStr;
            });

            last7Days.push({
                date: dateStr,
                total: dayLogs.length,
                sent: dayLogs.filter(log => log.status === 'sent').length,
                failed: dayLogs.filter(log => log.status === 'failed').length
            });
        }

        // Emails más recientes (últimos 10)
        const recentEmails = allLogs
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);

        const stats = {
            overview: {
                total,
                sent,
                failed,
                pending,
                success_rate: total > 0 ? ((sent / total) * 100).toFixed(1) : '0.0'
            },
            by_type: byType,
            last_7_days: last7Days,
            recent_emails: recentEmails
        };

        console.log('✅ Estadísticas calculadas');

        res.json(stats);

    } catch (error) {
        console.error('💥 Error obteniendo estadísticas de emails:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Reenviar un email (usando el log como referencia)
const resendEmail = async (req, res) => {
    try {
        const { logId } = req.params;

        console.log('📧 Reenviando email con log ID:', logId);

        // Obtener el log del email
        const logs = await emailService.getEmailLogs({ log_id: logId });

        if (logs.length === 0) {
            return res.status(404).json({ error: 'Log de email no encontrado' });
        }

        const emailLog = logs[0];

        // Verificar datos necesarios para reenviar
        if (!emailLog.purchase_id) {
            return res.status(400).json({ error: 'No se puede reenviar: falta información de la compra' });
        }

        // Obtener información de la compra
        const db = require('../config/database');
        const [purchaseRows] = await db.execute(`
      SELECT p.*, r.name as raffle_name,
             GROUP_CONCAT(t.ticket_number ORDER BY t.ticket_number) as ticket_numbers
      FROM purchases p
      JOIN raffles r ON p.raffle_id = r.id
      LEFT JOIN tickets t ON p.id = t.purchase_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [emailLog.purchase_id]);

        if (purchaseRows.length === 0) {
            return res.status(404).json({ error: 'Compra asociada no encontrada' });
        }

        const purchase = purchaseRows[0];
        const ticketNumbers = purchase.ticket_numbers ? purchase.ticket_numbers.split(',') : [];

        let result;

        // Reenviar según el tipo de email
        switch (emailLog.email_type) {
            case 'purchase_confirmation':
                result = await emailService.sendPurchaseConfirmationEmail(purchase, ticketNumbers);
                break;

            case 'status_update':
                const metadata = emailLog.metadata || {};
                const status = metadata.new_status || purchase.status;
                result = await emailService.sendStatusUpdateEmail(purchase, status, ticketNumbers);
                break;

            case 'ticket_modification':
                const modification = emailLog.metadata || {};
                result = await emailService.sendTicketModificationEmail(purchase, modification);
                break;

            default:
                return res.status(400).json({ error: 'Tipo de email no compatible para reenvío' });
        }

        if (result.success) {
            console.log('✅ Email reenviado exitosamente');
            res.json({
                message: 'Email reenviado exitosamente',
                email_type: emailLog.email_type,
                recipient: emailLog.recipient_email
            });
        } else {
            console.error('❌ Error reenviando email:', result.error);
            res.status(500).json({ error: 'Error al reenviar email: ' + result.error });
        }

    } catch (error) {
        console.error('💥 Error en reenvío de email:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Enviar email de prueba
const sendTestEmail = async (req, res) => {
    try {
        const { email, type = 'purchase_confirmation' } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Email requerido' });
        }

        console.log('🧪 Enviando email de prueba a:', email, 'tipo:', type);

        // Datos de prueba
        const testPurchaseData = {
            purchase_id: 999,
            customer_name: 'Usuario de Prueba',
            customer_phone: '+58412-555-0123',
            customer_email: email.trim(),
            customer_ci: '12345678',
            raffle_name: 'Rifa de Prueba 2024',
            ticket_quantity: 2,
            payment_method: 'pago_movil',
            payment_reference: 'TEST123456',
            total_amount: 300.00
        };

        const testTicketNumbers = ['0001', '0042'];

        let result;

        switch (type) {
            case 'purchase_confirmation':
                result = await emailService.sendPurchaseConfirmationEmail(testPurchaseData, testTicketNumbers);
                break;

            case 'status_update_approved':
                result = await emailService.sendStatusUpdateEmail(testPurchaseData, 'approved', testTicketNumbers);
                break;

            case 'status_update_rejected':
                result = await emailService.sendStatusUpdateEmail(testPurchaseData, 'rejected', testTicketNumbers);
                break;

            case 'ticket_modification_add':
                const addModification = {
                    type: 'add',
                    quantity: 1,
                    ticket_numbers: ['0123'],
                    all_ticket_numbers: ['0001', '0042', '0123'],
                    previous_quantity: 2,
                    new_quantity: 3,
                    amount_change: 150.00,
                    new_total_amount: 450.00
                };
                result = await emailService.sendTicketModificationEmail(testPurchaseData, addModification);
                break;

            case 'ticket_modification_remove':
                const removeModification = {
                    type: 'remove',
                    quantity: 1,
                    ticket_numbers: ['0042'],
                    all_ticket_numbers: ['0001'],
                    previous_quantity: 2,
                    new_quantity: 1,
                    amount_change: 150.00,
                    new_total_amount: 150.00
                };
                result = await emailService.sendTicketModificationEmail(testPurchaseData, removeModification);
                break;

            default:
                return res.status(400).json({ error: 'Tipo de email de prueba no válido' });
        }

        if (result.success) {
            console.log('✅ Email de prueba enviado exitosamente');
            res.json({
                message: 'Email de prueba enviado exitosamente',
                type: type,
                recipient: email.trim()
            });
        } else {
            console.error('❌ Error enviando email de prueba:', result.error);
            res.status(500).json({ error: 'Error al enviar email de prueba: ' + result.error });
        }

    } catch (error) {
        console.error('💥 Error en email de prueba:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    getEmailLogs,
    getEmailStats,
    resendEmail,
    sendTestEmail
};