import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to access all drivers and settings regardless of caller
        const drivers = await base44.asServiceRole.entities.Driver.list();
        const vehicles = await base44.asServiceRole.entities.DriverVehicle.list();
        const suppliers = await base44.asServiceRole.entities.Supplier.list();
        
        // Try to get admin phone for fallback
        let adminPhone = null;
        try {
            const appConfig = await base44.asServiceRole.entities.AppConfig.filter({ config_key: 'whatsapp_admin_number' });
            adminPhone = appConfig?.[0]?.config_value;
        } catch (e) {
            console.log('Admin phone config not found');
        }

        const today = new Date();
        today.setHours(0,0,0,0);

        const impediments = [];

        for (const driver of drivers) {
            // Skip already inactive/rejected unless they are just blocked by license
            if (!driver.active && !driver.license_blocked) continue;

            const issues = [];
            
            // Check CNH
            if (driver.license_expiry) {
                // Parse date "YYYY-MM-DD"
                const parts = driver.license_expiry.split('-');
                const expiryDate = new Date(parts[0], parts[1]-1, parts[2]); 
                expiryDate.setHours(0,0,0,0);
                
                if (expiryDate < today) {
                    issues.push(`CNH Vencida em ${format(expiryDate, 'dd/MM/yyyy')}`);
                    
                    // Auto-block if not blocked
                    if (!driver.license_blocked) {
                        await base44.asServiceRole.entities.Driver.update(driver.id, { license_blocked: true });
                        console.log(`Blocked driver ${driver.name} due to expired license`);
                    }
                }
            }

            // Check Vehicles
            const driverVehicles = vehicles.filter(v => v.driver_id === driver.id && v.active);
            for (const vehicle of driverVehicles) {
                // Se não tem data de validade (pendente)
                if (!vehicle.registration_expiry) {
                     issues.push(`Veículo ${vehicle.vehicle_model} (${vehicle.vehicle_plate}) com licenciamento pendente`);
                     if (!vehicle.registration_blocked) {
                         await base44.asServiceRole.entities.DriverVehicle.update(vehicle.id, { registration_blocked: true });
                     }
                } else {
                    // Checar validade
                    const parts = vehicle.registration_expiry.split('-');
                    const expiryDate = new Date(parts[0], parts[1]-1, parts[2]); 
                    expiryDate.setHours(0,0,0,0);

                    if (expiryDate < today) {
                        issues.push(`Licenciamento vencido: ${vehicle.vehicle_model} (${vehicle.vehicle_plate})`);
                        if (!vehicle.registration_blocked) {
                            await base44.asServiceRole.entities.DriverVehicle.update(vehicle.id, { registration_blocked: true });
                        }
                    }
                }
            }
            
            // Se tiver CNH vencida, bloquear o motorista
            // Se tiver veículo vencido, o veículo já foi bloqueado acima.
            // O motorista só é bloqueado se a CNH estiver ruim, ou se não tiver NENHUM veículo válido.
            
            const hasCnhIssue = issues.some(i => i.includes('CNH'));
            const validVehiclesCount = driverVehicles.filter(v => 
                v.registration_expiry && 
                new Date(v.registration_expiry.split('-')[0], v.registration_expiry.split('-')[1]-1, v.registration_expiry.split('-')[2]) >= today
            ).length;

            const shouldBlockDriver = hasCnhIssue || (validVehiclesCount === 0 && driverVehicles.length > 0);

            if (shouldBlockDriver) {
                 if (driver.active) {
                     await base44.asServiceRole.entities.Driver.update(driver.id, { active: false });
                     console.log(`Deactivating driver ${driver.name} due to impediments (CNH or No Valid Vehicle)`);
                 }
            } else if (!driver.active && !driver.license_blocked && validVehiclesCount > 0) {
                // Se não tem CNH bloqueada e tem pelo menos um veículo válido, garantir que está ativo
                // (Opcional, mas seguro se foi bloqueado por engano antes)
                await base44.asServiceRole.entities.Driver.update(driver.id, { active: true });
            }

            if (issues.length > 0) {
                impediments.push({
                    driver_id: driver.id,
                    driver_name: driver.name,
                    supplier_id: driver.supplier_id,
                    issues: issues,
                    phone: driver.phone_number,
                    email: driver.email
                });

                // Notify Driver via WhatsApp
                if (driver.phone_number) {
                    try {
                         await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
                            to: driver.phone_number,
                            message: `⚠️ *Atenção Motorista*\n\nIdentificamos pendências que bloqueiam seu acesso:\n\n${issues.join('\n')}\n\nPor favor, regularize em "Meus Documentos" para voltar a receber viagens.`
                        });
                    } catch (e) {
                        console.error(`Failed to notify driver ${driver.name}:`, e);
                    }
                }
            }
        }

        // Group by Supplier to notify Managers
        const impedimentsBySupplier = {};
        for (const imp of impediments) {
            const suppId = imp.supplier_id || 'admin';
            if (!impedimentsBySupplier[suppId]) impedimentsBySupplier[suppId] = [];
            impedimentsBySupplier[suppId].push(imp);
        }

        for (const suppId of Object.keys(impedimentsBySupplier)) {
            const driverList = impedimentsBySupplier[suppId];
            const messageLines = [`⚠️ *Relatório de Impedimentos - Motoristas*`];
            
            driverList.forEach(d => {
                messageLines.push(`- *${d.driver_name}*: ${d.issues.join(', ')}`);
            });

            messageLines.push(`\nOs motoristas listados foram notificados e tiveram o acesso temporariamente bloqueado até a regularização.`);

            let targetEmail = null;
            let targetPhone = null;

            if (suppId === 'admin') {
                targetPhone = adminPhone;
                // Send to super admin email if needed, or skip
            } else {
                const supplier = suppliers.find(s => s.id === suppId);
                if (supplier) {
                    targetEmail = supplier.email;
                    targetPhone = supplier.phone_number;
                }
            }

            // Send Email
            if (targetEmail) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: targetEmail,
                    subject: "Alerta de Impedimentos - Motoristas",
                    body: messageLines.join('\n').replace(/\*/g, '') // remove markdown bold for email
                });
            }
             
             // Send WhatsApp to Manager
             if (targetPhone) {
                 await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
                    to: targetPhone,
                    message: messageLines.join('\n')
                });
             }
        }

        return Response.json({ status: 'success', processed: drivers.length, impediments_found: impediments.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});