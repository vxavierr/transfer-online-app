import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId, passengerId, passengerIds } = await req.json();

        const targetPassengerIds = passengerIds || (passengerId ? [passengerId] : []);

        if (!tripId || targetPassengerIds.length === 0) {
            return Response.json({ error: 'Trip ID and Passenger ID(s) are required' }, { status: 400 });
        }

        // Fetch Data
        const trip = await base44.entities.EventTrip.get(tripId);
         if (!trip) {
             return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        const event = await base44.entities.Event.get(trip.event_id);
        if (!event) {
             return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        // Fetch Passengers
        const allTripPassengers = await base44.entities.EventPassenger.filter({ event_trip_id: tripId }, {}, 200);
        const passengers = allTripPassengers.filter(p => targetPassengerIds.includes(p.id));

        if (passengers.length === 0) {
             return Response.json({ error: 'No valid passengers found for this trip' }, { status: 404 });
        }

        // Get Driver/Vehicle Info (only for non-flexible allocation)
        const tripCodeInitials = trip.trip_code ? trip.trip_code.split('-')[0] : '';
        let driverName = "A definir";
        let driverPhone = "";
        let vehicleInfo = trip.vehicle_type_category || "A definir";
        let coordinatorContact = null;
        
        // Fetch common driver info once if possible
        let commonDriverInfo = null;

        // Prioridade: Motorista Eventual -> Subcontratado -> Motorista da Frota
        if (trip.is_casual_driver && trip.casual_driver_name) {
            driverName = trip.casual_driver_name;
            driverPhone = trip.casual_driver_phone || "";
            const model = trip.casual_driver_vehicle_model || "Veículo";
            const plate = trip.casual_driver_vehicle_plate || "";
            vehicleInfo = `${model} ${plate ? `(${plate})` : ''}`;
        } else if (trip.subcontractor_driver_name) {
            driverName = trip.subcontractor_driver_name;
            driverPhone = trip.subcontractor_driver_phone || "";
            const model = trip.subcontractor_vehicle_model || "Veículo";
            const plate = trip.subcontractor_vehicle_plate || "";
            vehicleInfo = `${model} ${plate ? `(${plate})` : ''}`;
        } else if (trip.driver_id) {
            try {
                const driver = await base44.entities.Driver.get(trip.driver_id);
                if (driver) {
                    driverName = driver.full_name || driver.name || "Motorista";
                    driverPhone = driver.phone_number || driver.phone || "";
                }
            } catch (e) {
                console.warn('Driver not found', e);
            }
        }

        if ((vehicleInfo === "A definir" || vehicleInfo === trip.vehicle_type_category) && trip.vehicle_id) {
            try {
                const vehicle = await base44.entities.DriverVehicle.get(trip.vehicle_id);
                if (vehicle) {
                    const model = vehicle.vehicle_model || vehicle.model || "Veículo";
                    const plate = vehicle.vehicle_plate || vehicle.plate || "";
                    vehicleInfo = `${model} ${plate ? `(${plate})` : ''}`;
                }
            } catch (e) {
                console.warn('Vehicle not found', e);
            }
        }
        
        commonDriverInfo = { driverName, driverPhone, vehicleInfo };

        // Generate URL
        let appUrl = Deno.env.get('BASE_URL') || 'https://app.base44.com';
        if (!appUrl.startsWith('http')) {
            appUrl = `https://${appUrl}`;
        }

        // WhatsApp Configuration
        const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
        const apiUrl = Deno.env.get('EVOLUTION_API_URL');
        const token = Deno.env.get('EVOLUTION_API_KEY');
        const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

        if (!instanceId || !apiUrl || !token) {
            return Response.json({ error: "WhatsApp configuration missing" }, { status: 500 });
        }

        // Construct base URL for WhatsApp API
        let whatsappBaseUrl = apiUrl.trim();
        while(whatsappBaseUrl.endsWith('/')) whatsappBaseUrl = whatsappBaseUrl.slice(0, -1);
        try {
            const urlObj = new URL(whatsappBaseUrl);
            whatsappBaseUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {
             console.warn("Invalid API URL format", e);
        }
        const whatsappUrl = `${whatsappBaseUrl}/instances/${instanceId}/token/${token}/send-image`;
        
        let successCount = 0;
        let failedCount = 0;
        const results = [];

        // Check for coordinator contact
        if (trip.coordinator_ids && trip.coordinator_ids.length > 0) {
            try {
                const primaryCoordinatorId = trip.coordinator_ids[0];
                const coordinator = await base44.entities.Coordinator.get(primaryCoordinatorId);
                if (coordinator && coordinator.phone_number) {
                    coordinatorContact = { name: coordinator.name, phone: coordinator.phone_number };
                }
            } catch (e) {
                console.warn('Error fetching coordinator details', e);
            }
        }

        // Group Analysis Logic
        const allFlights = allTripPassengers
            .map(p => ({
                flight: p.flight_number ? p.flight_number.trim() : null,
                time: p.flight_time || p.time || "00:00",
                date: p.flight_date || p.date || trip.date
            }))
            .filter(f => f.flight); // Only valid flights

        // Count unique flights (showing only number as requested)
        const uniqueFlights = [...new Set(allFlights.map(f => f.flight))];
        const isGroupedWithDifferentFlights = uniqueFlights.length > 1;

        let latestArrivalTime = null;
        if (isGroupedWithDifferentFlights) {
            // Find latest arrival
            allFlights.forEach(f => {
                const [h, m] = f.time.split(':').map(Number);
                // Create comparable date object (assuming same day for simplicity or using flight_date)
                // Using trip date as base if flight_date missing
                const flightDateStr = f.date || trip.date;
                const d = new Date(`${flightDateStr}T${f.time}:00`); // ISO format YYYY-MM-DDTHH:mm:00
                if (!latestArrivalTime || d > latestArrivalTime) {
                    latestArrivalTime = d;
                }
            });
        }

        // Loop through passengers
        for (const passenger of passengers) {
            try {
                 // Determine driver info for this passenger
                let currentVehicleInfo = commonDriverInfo.vehicleInfo;
                let currentDriverName = commonDriverInfo.driverName;
                let currentDriverPhone = commonDriverInfo.driverPhone;
                let showDriverInfo = !passenger.is_flexible_allocation;

                if (passenger.is_flexible_allocation) {
                    currentVehicleInfo = trip.name || "Porta a Porta";
                }

                const checkinUrl = `${appUrl}/checkin?tripId=${tripId}&passengerId=${passenger.id}`;

                let message = `🎫 *Cartão de Embarque - ${event.event_name}*

Olá, *${passenger.passenger_name}*!
Aqui estão os detalhes do seu transfer:

📅 *Data:* ${formatDate(trip.date)}
⏰ *Horário:* ${trip.start_time}
📍 *Origem:* ${trip.origin}`;

                if (isGroupedWithDifferentFlights) {
                    message += `\n\n⚠️ *Atenção:* Seu Transfer foi agrupado com outros passageiros com voos distintos, fique tranquilo nosso receptivo irá aguardá-lo.`;
                    
                    message += `\n\n🛫 *Voos do Grupo:*`;
                    uniqueFlights.forEach(f => {
                        message += `\n• Voo ${f}`;
                    });

                    if (latestArrivalTime) {
                        message += `\n\n🕒 *Previsão de Saída do Grupo:* Após chegada de todos`;
                    }
                }

                let stops = trip.additional_stops;
                if (typeof stops === 'string') {
                    try { stops = JSON.parse(stops); } catch(e) { stops = []; }
                }
                if (!Array.isArray(stops)) stops = [];

                if (stops.length > 0) {
                    message += `\n🛑 *Paradas:*`;
                    stops.forEach((stop, idx) => {
                        const stopText = stop.address || stop.notes || '-';
                        const stopNote = (stop.address && stop.notes) ? ` (${stop.notes})` : '';
                        message += `\n• ${idx + 1}: ${stopText}${stopNote}`;
                    });
                }

                message += `\n🏁 *Destino:* ${trip.destination}`;

                if (coordinatorContact) {
                    message += `\n🚗 *Veículo/Identificação:* ${tripCodeInitials ? `[${tripCodeInitials}] ` : ''}${currentVehicleInfo}`;
                    message += `\n\n📞 *Contato para Dúvidas:*\n${coordinatorContact.name} (${coordinatorContact.phone})\n*Para informações da sua viagem, por favor, contate o(a) coordenador(a) acima.*`;
                } else if (showDriverInfo) {
                    message += `
🚗 *Veículo:* ${tripCodeInitials ? `[${tripCodeInitials}] ` : ''}${currentVehicleInfo}
👤 *Motorista:* ${currentDriverName} ${currentDriverPhone ? `(${currentDriverPhone})` : ''}`;
                } else {
                    message += `
🚐 *Serviço:* ${tripCodeInitials ? `[${tripCodeInitials}] ` : ''}${currentVehicleInfo}`;
                }

                message += `

🔗 *Se solicitado apresente seu QR Code.*

Boa viagem!`;

                const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(checkinUrl)}`;

                const originalPhone = passenger.passenger_phone || passenger.phone_number;
                if (!originalPhone) {
                    results.push({ id: passenger.id, success: false, error: 'No phone number' });
                    failedCount++;
                    continue;
                }
                
                let phone = originalPhone.replace(/\D/g, '');
                if (!originalPhone.includes('+') && !phone.startsWith('55')) {
                    phone = '55' + phone;
                }

                // Send Request
                const headers = { 'Content-Type': 'application/json' };
                if (clientToken) headers['Client-Token'] = clientToken;

                const response = await fetch(whatsappUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        phone: phone,
                        image: qrCodeUrl,
                        caption: message
                    })
                });

                if (!response.ok) {
                    const responseText = await response.text();
                     // Try to update status to failed
                    try {
                        await base44.entities.EventPassenger.update(passenger.id, {
                            whatsApp_last_sent_at: new Date().toISOString(),
                            whatsApp_last_sent_status: 'failed'
                        });
                    } catch(e) {}
                    
                    results.push({ id: passenger.id, success: false, error: `API Error: ${response.status} - ${responseText}` });
                    failedCount++;
                    continue;
                }

                // Update passenger status on success
                await base44.entities.EventPassenger.update(passenger.id, {
                    whatsApp_last_sent_at: new Date().toISOString(),
                    whatsApp_last_sent_status: 'success',
                    phone_validation_status: 'valid'
                });
                
                results.push({ id: passenger.id, success: true });
                successCount++;

            } catch (err) {
                 console.error(`Error sending WhatsApp to ${passenger.id}:`, err);
                 results.push({ id: passenger.id, success: false, error: err.message });
                 failedCount++;
            }
        }

        return Response.json({ success: true, successCount, failedCount, results });

    } catch (error) {
        console.error('Error sending WhatsApp:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const cleanDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;
        const [year, month, day] = cleanDate.split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
}