import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Helper to parse trip datetime
function getTripDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    // Assume date is YYYY-MM-DD and time is HH:MM or HH:MM:SS
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const dt = new Date(year, month - 1, day, hours, minutes);
    return dt;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const startTime = Date.now();
        
        // This is an automated system function, so we use service role
        // However, usually we might check for an admin user trigger or just run as service if it's a cron.
        // Since it's a cron, we rely on the fact that it's called internally or we can use service role.
        
        const now = new Date();
        // Adjust to Brazil time for "today" filtering if needed, but easier to work with timestamps.
        // We'll fetch trips for today and tomorrow to be safe.
        
        const todayStr = now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        console.log(`[Reminders] Starting check at ${now.toISOString()} for dates ${todayStr} and ${tomorrowStr}`);

        let remindersSent = 0;
        let errors = 0;

        // 1. Process ServiceRequest
        // -------------------------
        const serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({
            driver_reminder_1h_sent_at: null, // Only those not sent
            // We can't easily filter by date OR date in SDK sometimes, so let's fetch active ones
            // Actually, best to fetch by status and filter in memory if volume isn't huge.
            // Or fetch by date. Let's try fetching by date.
            // Since we can't do OR in simple filter, we do two queries or just list active.
            // Let's list active confirmed trips and filter.
        });

        // Filter for relevant dates and times (1h to 3h from now window for robustness)
        // User asked for "reminder", usually 1-2 hours before.
        
        const reminderWindowStart = 45; // minutes from now
        const reminderWindowEnd = 180; // minutes from now (3 hours)
        
        const processTrip = async (trip, type, driverPhone, driverName) => {
             // Basic validation
             if (!driverPhone) {
                 console.log(`[Reminders] Trip ${trip.id} (${type}) has no driver phone. Skipping.`);
                 return;
             }

             // Date parsing
             // Handle different field names
             let dateStr = trip.date;
             let timeStr = trip.time || trip.start_time; // EventTrip uses start_time
             
             if (!dateStr || !timeStr) return;

             // Clean time string (sometimes comes as HH:MM:SS)
             if (timeStr.length > 5) timeStr = timeStr.substring(0, 5);

             // Create Date object (Local time effectively, assuming inputs are local)
             // We need to compare with "now" in the same timezone context.
             // The server "now" is UTC. The trip date/time is usually stored as "Local Time String" (e.g. 14:00 in SP).
             // So we should convert "now" to SP time to compare, OR convert trip time to UTC.
             // Easier: treat trip date/time as UTC-3 (SP) and compare to UTC now.
             
             // Construct trip date assuming it's America/Sao_Paulo (UTC-3)
             // We'll create an ISO string with -03:00 offset
             const tripISO = `${dateStr}T${timeStr}:00-03:00`;
             const tripDate = new Date(tripISO);
             
             const diffMs = tripDate.getTime() - now.getTime();
             const diffMinutes = diffMs / (1000 * 60);

             if (diffMinutes >= reminderWindowStart && diffMinutes <= reminderWindowEnd) {
                 console.log(`[Reminders] Trip ${trip.id} is starting in ${Math.round(diffMinutes)} mins. Sending reminder to ${driverName} (${driverPhone}).`);
                 
                 // Build message
                 const passengers = trip.passengers_details ? trip.passengers_details.map(p => p.name).join(', ') : (trip.passenger_name || trip.customer_name || 'Passageiro');
                 
                 let message = `🚗 *Lembrete de Viagem - TransferOnline*\n\n`;
                 message += `Olá *${driverName}*, você tem uma viagem agendada para breve!\n\n`;
                 message += `📅 *Data:* ${dateStr.split('-').reverse().join('/')}\n`;
                 message += `⏰ *Horário:* ${timeStr}\n`;
                 message += `📍 *Origem:* ${trip.origin}\n`;
                 message += `🏁 *Destino:* ${trip.destination || 'A definir'}\n`;
                 message += `👥 *Passageiro(s):* ${passengers}\n`;
                 
                 if (trip.flight_number || trip.origin_flight_number) {
                     message += `✈️ *Voo:* ${trip.flight_number || trip.origin_flight_number}\n`;
                 }

                 // Stops Logic
                 const stops = trip.planned_stops || trip.additional_stops || [];
                 if (stops && stops.length > 0) {
                     message += `🛑 *Paradas:*\n`;
                     stops.forEach((stop, idx) => {
                         const addr = stop.address || stop.local || 'Endereço não informado';
                         const note = stop.notes ? ` (${stop.notes})` : '';
                         message += `   ${idx + 1}. ${addr}${note}\n`;
                     });
                 }
                 
                 if (trip.notes) {
                     message += `📝 *Obs:* ${trip.notes}\n`;
                 }
                 if (trip.partner_notes) {
                     message += `ℹ️ *Nota Parceiro:* ${trip.partner_notes}\n`;
                 }

                 message += `\nPor favor, inicie o deslocamento com antecedência. Bom trabalho!`;

                 // Send WhatsApp
                 try {
                     const res = await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
                         to: driverPhone,
                         message: message
                     });
                     
                     if (res.data?.success) {
                         // Update trip
                         let updateEntity = '';
                         if (type === 'ServiceRequest') updateEntity = 'ServiceRequest';
                         if (type === 'SupplierOwnBooking') updateEntity = 'SupplierOwnBooking';
                         if (type === 'EventTrip') updateEntity = 'EventTrip';
                         
                         if (updateEntity) {
                             await base44.asServiceRole.entities[updateEntity].update(trip.id, {
                                 driver_reminder_1h_sent_at: new Date().toISOString()
                             });
                             remindersSent++;
                             console.log(`[Reminders] Success for trip ${trip.id}`);
                         }
                     } else {
                         console.error(`[Reminders] Failed to send WhatsApp for trip ${trip.id}:`, res.data);
                         errors++;
                     }
                 } catch (err) {
                     console.error(`[Reminders] Error sending/updating for trip ${trip.id}:`, err);
                     errors++;
                 }
             }
        };

        // Filter and process ServiceRequests
        // Since we can't filter complex dates in API easily, we iterate.
        // Optimization: filter by status 'confirmada' is already done.
        // Helper to resolve driver info
        const resolveDriverInfo = async (trip) => {
            if (trip.driver_phone) return { phone: trip.driver_phone, name: trip.driver_name || 'Motorista' };
            if (trip.driver_id) {
                try {
                    const driver = await base44.asServiceRole.entities.Driver.get(trip.driver_id);
                    if (driver) return { phone: driver.phone_number, name: driver.name };
                } catch (e) { console.error(e); }
            }
            return null;
        };

        for (const trip of serviceRequests) {
             if (trip.date === todayStr || trip.date === tomorrowStr) {
                 if (trip.driver_id) {
                     const info = await resolveDriverInfo(trip);
                     if (info) await processTrip(trip, 'ServiceRequest', info.phone, info.name);
                 }
             }
        }

        // 2. Process SupplierOwnBooking
        const supplierBookings = await base44.asServiceRole.entities.SupplierOwnBooking.filter({
            driver_reminder_1h_sent_at: null
        });

        for (const trip of supplierBookings) {
             if (trip.date === todayStr || trip.date === tomorrowStr) {
                 if (trip.driver_id) {
                     const info = await resolveDriverInfo(trip);
                     if (info) await processTrip(trip, 'SupplierOwnBooking', info.phone, info.name);
                 }
             }
        }

        // 3. Process EventTrip
        // Event trips might be 'confirmed' or 'planned' or 'dispatched'
        const eventTrips = await base44.asServiceRole.entities.EventTrip.filter({
            driver_reminder_1h_sent_at: null
        });
        // Also check 'dispatched' if applicable? Usually 'confirmed' is enough before it starts.
        
        // Fetch drivers cache to avoid N+1 queries if possible, or just fetch one by one.
        // Given volume is usually low for "next 2 hours", one by one is okay.
        
        for (const trip of eventTrips) {
             if (trip.date === todayStr || trip.date === tomorrowStr) {
                 let phone = null;
                 let name = 'Motorista';
                 
                 // Fetch passengers for EventTrip
                 try {
                     const eventPassengers = await base44.asServiceRole.entities.EventPassenger.filter({ event_trip_id: trip.id });
                     if (eventPassengers && eventPassengers.length > 0) {
                         trip.passengers_details = eventPassengers.map(p => ({ name: p.passenger_name }));
                     }
                 } catch (e) {
                     console.error(`[Reminders] Error fetching passengers for EventTrip ${trip.id}:`, e);
                 }

                 // Check if it has a driver_id
                 if (trip.driver_id) {
                     // Need to fetch driver info
                     try {
                         const driver = await base44.asServiceRole.entities.Driver.get(trip.driver_id);
                         if (driver) {
                             phone = driver.phone_number;
                             name = driver.name;
                         }
                     } catch (e) {
                         console.error(`[Reminders] Could not fetch driver ${trip.driver_id} for EventTrip ${trip.id}`);
                     }
                 } else if (trip.subcontractor_driver_phone) {
                     phone = trip.subcontractor_driver_phone;
                     name = trip.subcontractor_driver_name || 'Motorista';
                 } else if (trip.casual_driver_phone) {
                     phone = trip.casual_driver_phone;
                     name = trip.casual_driver_name || 'Motorista';
                 }

                 if (phone) {
                     await processTrip(trip, 'EventTrip', phone, name);
                 }
             }
        }

        // Log to IntegrationLog
        try {
            await base44.asServiceRole.entities.IntegrationLog.create({
                service_name: 'Auto - Driver Reminders (Legacy)',
                action: 'send_reminders_legacy',
                status: errors > 0 ? 'warning' : 'success',
                message: `Enviadas: ${remindersSent}, Erros: ${errors}`,
                executed_at: new Date().toISOString(),
                duration_ms: Date.now() - startTime
            });
        } catch (e) { console.error("Error logging to IntegrationLog:", e); }

        return Response.json({ 
            success: true, 
            reminders_sent: remindersSent, 
            errors: errors,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Reminders] Critical error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});