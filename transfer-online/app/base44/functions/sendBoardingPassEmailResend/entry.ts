import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Resend } from 'npm:resend';

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

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

        // Fetch Trip Data
        const trip = await base44.entities.EventTrip.get(tripId);
        if (!trip) {
             return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        const event = await base44.entities.Event.get(trip.event_id);
        if (!event) {
             return Response.json({ error: 'Event not found' }, { status: 404 });
        }

         // Get Driver/Vehicle Info (Enhanced Logic)
        let driverName = "A definir";
        let driverPhone = "";
        let vehicleInfo = trip.vehicle_type_category || "A definir";
        
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
            } catch (e) {}
        }
        
        if ((vehicleInfo === "A definir" || vehicleInfo === trip.vehicle_type_category) && trip.vehicle_id) {
             try {
                const vehicle = await base44.entities.DriverVehicle.get(trip.vehicle_id);
                if (vehicle) {
                    const model = vehicle.vehicle_model || vehicle.model || "Veículo";
                    const plate = vehicle.vehicle_plate || vehicle.plate || "";
                    vehicleInfo = `${model} ${plate ? `(${plate})` : ''}`;
                }
            } catch (e) {}
        }

        // Fetch Passengers
        const allTripPassengers = await base44.entities.EventPassenger.filter({ event_trip_id: tripId }, {}, 200);
        const passengers = allTripPassengers.filter(p => targetPassengerIds.includes(p.id));

        if (passengers.length === 0) {
             return Response.json({ error: 'No valid passengers found for this trip' }, { status: 404 });
        }

        let appUrl = Deno.env.get('BASE_URL') || 'https://app.base44.com';
        if (!appUrl.startsWith('http')) {
            appUrl = `https://${appUrl}`;
        }

        // Initialize Resend
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
            console.error('[Email Debug] RESEND_API_KEY is missing');
            throw new Error('RESEND_API_KEY not configured');
        }
        const resend = new Resend(resendApiKey);

        const envFrom = Deno.env.get('RESEND_FROM');
        const defaultFrom = 'TransferOnline <nao-responda@enviotransferonline.com.br>';
        const fromAddress = envFrom || defaultFrom;

        console.log(`[Email Debug] Initializing with From Address: "${fromAddress}" (Env: "${envFrom || 'Not Set'}", Default: "${defaultFrom}")`);

        let successCount = 0;
        let failedCount = 0;
        const results = [];

        const processPassenger = async (passenger) => {
            try {
                const email = passenger.passenger_email || passenger.email;
                if (!email) {
                    return { id: passenger.id, success: false, error: 'No email' };
                }

                const checkinUrl = `${appUrl}/checkin?tripId=${tripId}&passengerId=${passenger.id}`;
                const subject = `Cartão de Embarque - ${event.event_name}`;
                
                // Use passenger specific time if available (flight time), else trip time
                const tripTime = passenger.time || passenger.flight_time || trip.start_time;
                const tripDate = formatDate(passenger.date || passenger.flight_date || trip.date);

                const body = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #2563eb;">Cartão de Embarque</h2>
                        <p>Olá <strong>${passenger.passenger_name}</strong>,</p>
                        <p>Aqui estão os detalhes do seu transfer para o evento <strong>${event.event_name}</strong>:</p>
                        
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
                            <p style="margin: 8px 0;"><strong>Data:</strong> ${tripDate}</p>
                            <p style="margin: 8px 0;"><strong>Horário:</strong> ${tripTime}</p>
                            <p style="margin: 8px 0;"><strong>Origem:</strong> ${trip.origin}</p>
                            <p style="margin: 8px 0;"><strong>Destino:</strong> ${trip.destination}</p>
                            <p style="margin: 8px 0;"><strong>Veículo:</strong> ${vehicleInfo}</p>
                            ${driverName !== "A definir" ? `<p style="margin: 8px 0;"><strong>Motorista:</strong> ${driverName}</p>` : ''}
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${checkinUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Acessar Cartão de Embarque
                            </a>
                            <p style="font-size: 12px; color: #64748b; margin-top: 15px;">
                                Ou acesse este link: <a href="${checkinUrl}" style="color: #2563eb;">${checkinUrl}</a>
                            </p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                            Enviado via TransferOnline
                        </p>
                    </div>
                `;

                console.log(`[Email Debug] Sending email to: ${email}`);

                const { data, error } = await resend.emails.send({
                    from: fromAddress,
                    to: [email],
                    subject: subject,
                    html: body,
                });

                if (error) {
                    console.error(`[Email Debug] Resend API Error for ${email}:`, JSON.stringify(error));
                    throw new Error(`Resend Error: ${error.message} (Code: ${error.name})`);
                }

                console.log(`[Email Debug] Success for ${email}. Resend ID: ${data?.id}`);

                await base44.entities.EventPassenger.update(passenger.id, {
                    email_last_sent_at: new Date().toISOString(),
                    email_last_sent_status: 'success',
                    email_validation_status: 'valid'
                });

                return { id: passenger.id, success: true, data };

            } catch (err) {
                console.error(`Failed to send email to passenger ${passenger.id}:`, err);
                
                try {
                    await base44.entities.EventPassenger.update(passenger.id, {
                        email_last_sent_at: new Date().toISOString(),
                        email_last_sent_status: 'failed'
                    });
                } catch (e) {}
                
                return { id: passenger.id, success: false, error: err.message };
            }
        };

        // Chunking manually for concurrency control
        const CONCURRENCY = 3;
        for (let i = 0; i < passengers.length; i += CONCURRENCY) {
            const chunk = passengers.slice(i, i + CONCURRENCY);
            const chunkResults = await Promise.all(chunk.map(processPassenger));
            
            chunkResults.forEach(res => {
                results.push(res);
                if (res.success) successCount++;
                else failedCount++;
            });
        }

        return Response.json({ success: true, successCount, failedCount, results });

    } catch (error) {
        console.error('Error sending Email via Resend:', error);
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