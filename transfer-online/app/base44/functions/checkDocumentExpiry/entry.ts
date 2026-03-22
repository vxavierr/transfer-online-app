import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Usar service role para operação de sistema
    const drivers = await base44.asServiceRole.entities.Driver.list();
    const vehicles = await base44.asServiceRole.entities.DriverVehicle.list();
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    let driversAlerted = 0;
    let driversBlocked = 0;
    let vehiclesAlerted = 0;
    let vehiclesBlocked = 0;
    
    // Verificar CNHs
    for (const driver of drivers) {
      if (!driver.license_expiry) continue;
      
      const expiryDate = new Date(driver.license_expiry);
      const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      // CNH vencida - bloquear motorista
      if (daysUntilExpiry < 0 && !driver.license_blocked) {
        await base44.asServiceRole.entities.Driver.update(driver.id, {
          license_blocked: true,
          active: false
        });
        
        // Enviar notificação de bloqueio
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: driver.email || driver.phone_number,
          subject: '🚨 CNH Vencida - Motorista Bloqueado',
          body: `Olá ${driver.name},\n\nSua CNH venceu em ${expiryDate.toLocaleDateString('pt-BR')}.\n\nVocê foi BLOQUEADO para novas viagens até regularizar sua documentação.\n\nAcesse "Meus Documentos" na plataforma e faça o upload da CNH renovada o quanto antes.\n\nAtenciosamente,\nTransferOnline`
        });
        
        driversBlocked++;
      }
      // CNH vence em 30 dias ou menos - enviar alerta
      else if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && !driver.license_alert_sent) {
        await base44.asServiceRole.entities.Driver.update(driver.id, {
          license_alert_sent: true
        });
        
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: driver.email || driver.phone_number,
          subject: `⚠️ CNH Vence em ${daysUntilExpiry} dias`,
          body: `Olá ${driver.name},\n\nSua CNH vence em ${daysUntilExpiry} dias (${expiryDate.toLocaleDateString('pt-BR')}).\n\nPara evitar bloqueio, acesse "Meus Documentos" na plataforma e faça o upload da CNH renovada antes do vencimento.\n\nAtenciosamente,\nTransferOnline`
        });
        
        driversAlerted++;
      }
      // CNH renovada (data futura após upload) - desbloquear
      else if (daysUntilExpiry > 30 && driver.license_blocked) {
        await base44.asServiceRole.entities.Driver.update(driver.id, {
          license_blocked: false,
          active: true,
          license_alert_sent: false
        });
      }
    }
    
    // Verificar Licenciamentos de Veículos
    for (const vehicle of vehicles) {
      if (!vehicle.registration_expiry) continue;
      
      const expiryDate = new Date(vehicle.registration_expiry);
      const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      // Buscar dados do motorista para notificação
      const driver = drivers.find(d => d.id === vehicle.driver_id);
      if (!driver) continue;
      
      // Licenciamento vencido - bloquear veículo
      if (daysUntilExpiry < 0) {
        if (!vehicle.registration_blocked) {
            await base44.asServiceRole.entities.DriverVehicle.update(vehicle.id, {
            registration_blocked: true,
            active: false
            });
            vehiclesBlocked++;
        }

        // Verificar se o motorista ainda tem algum veículo válido
        // Se tiver pelo menos um veículo válido, NÃO bloquear o motorista
        const driverVehicles = vehicles.filter(v => v.driver_id === driver.id && v.id !== vehicle.id);
        const hasValidVehicle = driverVehicles.some(v => 
            v.active && 
            !v.registration_blocked && 
            v.registration_expiry && 
            new Date(v.registration_expiry) >= today
        );

        if (!hasValidVehicle && driver.active) {
            // Só bloqueia o motorista se ele não tiver mais nenhum veículo válido
            await base44.asServiceRole.entities.Driver.update(driver.id, { active: false });
            
            await base44.asServiceRole.integrations.Core.SendEmail({
            to: driver.email || driver.phone_number,
            subject: '🚨 Todos Veículos Vencidos - Conta Bloqueada',
            body: `Olá ${driver.name},\n\nIdentificamos que todos os seus veículos cadastrados estão com licenciamento vencido.\n\nSua conta foi temporariamente bloqueada até que pelo menos um veículo seja regularizado.\n\nAcesse "Meus Documentos" na plataforma e faça o upload do licenciamento renovado.\n\nAtenciosamente,\nTransferOnline`
            });
        }
      }
      // Licenciamento vence em 30 dias ou menos
      else if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && !vehicle.registration_alert_sent) {
        await base44.asServiceRole.entities.DriverVehicle.update(vehicle.id, {
          registration_alert_sent: true
        });
        
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: driver.email || driver.phone_number,
          subject: `⚠️ Licenciamento Vence em ${daysUntilExpiry} dias`,
          body: `Olá ${driver.name},\n\nO licenciamento do veículo ${vehicle.vehicle_model} (${vehicle.vehicle_plate}) vence em ${daysUntilExpiry} dias (${expiryDate.toLocaleDateString('pt-BR')}).\n\nPara evitar bloqueio, acesse "Meus Documentos" e faça o upload do licenciamento renovado antes do vencimento.\n\nAtenciosamente,\nTransferOnline`
        });
        
        vehiclesAlerted++;
      }
      // Licenciamento renovado - desbloquear
      else if (daysUntilExpiry > 30 && vehicle.registration_blocked) {
        await base44.asServiceRole.entities.DriverVehicle.update(vehicle.id, {
          registration_blocked: false,
          active: true,
          registration_alert_sent: false
        });
      }
    }
    
    return Response.json({
      success: true,
      summary: {
        drivers_alerted: driversAlerted,
        drivers_blocked: driversBlocked,
        vehicles_alerted: vehiclesAlerted,
        vehicles_blocked: vehiclesBlocked,
        total_drivers_checked: drivers.length,
        total_vehicles_checked: vehicles.length
      }
    });
    
  } catch (error) {
    console.error('[checkDocumentExpiry] Erro:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});