import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { addDays, isBefore, parseISO, differenceInDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.supplier_id) {
            return Response.json({ count: 0, alerts: [] });
        }

        const drivers = await base44.entities.Driver.filter({
            supplier_id: user.supplier_id,
            active: true
        });

        const today = new Date();
        const warningThreshold = addDays(today, 30); // Aviso com 30 dias de antecedência

        const alerts = [];

        drivers.forEach(driver => {
            if (driver.license_expiry) {
                const expiryDate = parseISO(driver.license_expiry);
                const daysToExpiry = differenceInDays(expiryDate, today);

                if (isBefore(expiryDate, today)) {
                    alerts.push({
                        type: 'expired',
                        entity: 'driver',
                        id: driver.id,
                        name: driver.name,
                        message: `CNH de ${driver.name} VENCEU em ${driver.license_expiry}`,
                        days: daysToExpiry
                    });
                } else if (isBefore(expiryDate, warningThreshold)) {
                    alerts.push({
                        type: 'warning',
                        entity: 'driver',
                        id: driver.id,
                        name: driver.name,
                        message: `CNH de ${driver.name} vence em ${daysToExpiry} dias (${driver.license_expiry})`,
                        days: daysToExpiry
                    });
                }
            }
        });

        // Futuramente, adicionar verificação de veículos aqui se houver campo de validade

        return Response.json({
            count: alerts.length,
            alerts: alerts.sort((a, b) => a.days - b.days)
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});