import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { tripId, tripType, overrideDriverName } = await req.json();

        if (!tripId) {
            return Response.json({ error: 'tripId is required' }, { status: 400 });
        }

        console.log(`[notifyDriverArrival] Processing for Trip ${tripId} (${tripType})`);

        // 1. Fetch Trip Data
        let trip = null;
        let actualTripType = tripType;
        let passengersToNotify = [];
        let driverName = overrideDriverName;

        // Helper to normalize phone
        const normalizePhone = (p) => {
            if (!p) return null;
            let clean = p.replace(/\D/g, '');
            if (clean.length < 10) return null; // Too short
            return clean;
        };

        // Fetch Trip Logic
        if (!actualTripType) {
            // Try to guess or find
            const attempts = [
                { type: 'EventTrip', entity: base44.asServiceRole.entities.EventTrip },
                { type: 'ServiceRequest', entity: base44.asServiceRole.entities.ServiceRequest },
                { type: 'Booking', entity: base44.asServiceRole.entities.Booking },
                { type: 'SupplierOwnBooking', entity: base44.asServiceRole.entities.SupplierOwnBooking }
            ];

            for (const attempt of attempts) {
                try {
                    const found = await attempt.entity.get(tripId);
                    if (found) {
                        trip = found;
                        actualTripType = attempt.type;
                        break;
                    }
                } catch (e) {}
            }
        } else {
             // Fetch directly
             const entityMap = {
                 'EventTrip': base44.asServiceRole.entities.EventTrip,
                 'event_trip': base44.asServiceRole.entities.EventTrip,
                 'ServiceRequest': base44.asServiceRole.entities.ServiceRequest,
                 'service_request': base44.asServiceRole.entities.ServiceRequest,
                 'Booking': base44.asServiceRole.entities.Booking,
                 'booking': base44.asServiceRole.entities.Booking,
                 'SupplierOwnBooking': base44.asServiceRole.entities.SupplierOwnBooking,
                 'supplier_own_booking': base44.asServiceRole.entities.SupplierOwnBooking
             };
             
             const entity = entityMap[actualTripType];
             if (entity) {
                 trip = await entity.get(tripId).catch(() => null);
             }
        }

        if (!trip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // 2. Resolve Driver Name
        if (!driverName) {
            driverName = trip.driver_name || trip.subcontractor_driver_name || trip.casual_driver_name;
            
            // If still no name and has driver_id, fetch Driver
            if (!driverName && trip.driver_id) {
                try {
                    const driver = await base44.asServiceRole.entities.Driver.get(trip.driver_id);
                    if (driver) driverName = driver.name;
                } catch (e) {}
            }
        }
        
        if (!driverName) driverName = "seu motorista";

        // 3. Resolve Passengers
        const normalizeAddress = (addr) => {
             if (!addr) return '';
             return addr.toLowerCase().trim().replace(/[^\w\s]/gi, '');
        };
        const tripOriginNorm = trip.origin ? normalizeAddress(trip.origin) : '';

        if (actualTripType === 'EventTrip' || actualTripType === 'event_trip') {
            const eventPassengers = await base44.asServiceRole.entities.EventPassenger.filter({ event_trip_id: tripId });
            
            for (const p of eventPassengers) {
                const phone = normalizePhone(p.passenger_phone);
                if (phone) {
                    let shouldNotify = true;
                    // Se houver endereço de origem na viagem e no passageiro, verifica correspondência
                    if (tripOriginNorm && p.origin_address) {
                        const pOriginNorm = normalizeAddress(p.origin_address);
                        // Verifica se um contém o outro para flexibilidade
                        if (!pOriginNorm.includes(tripOriginNorm) && !tripOriginNorm.includes(pOriginNorm)) {
                            shouldNotify = false;
                        }
                    }

                    if (shouldNotify) {
                        passengersToNotify.push({
                            name: p.passenger_name.split(' ')[0],
                            phone: phone
                        });
                    }
                }
            }
        } else if (actualTripType === 'ServiceRequest' || actualTripType === 'service_request') {
             // Verificar detalhes dos passageiros se houver
             if (trip.passengers_details && trip.passengers_details.length > 0) {
                 for (const detail of trip.passengers_details) {
                     const phone = normalizePhone(detail.phone_number);
                     if (phone) {
                         let shouldNotify = true;
                         // Verifica boarding_point vs origin
                         if (tripOriginNorm && detail.boarding_point) {
                             const pBoardingNorm = normalizeAddress(detail.boarding_point);
                             if (!pBoardingNorm.includes(tripOriginNorm) && !tripOriginNorm.includes(pBoardingNorm)) {
                                 shouldNotify = false;
                             }
                         }
                         
                         if (shouldNotify) {
                             passengersToNotify.push({
                                 name: detail.name.split(' ')[0],
                                 phone: phone
                             });
                         }
                     }
                 }
                 // Se não encontrou ninguém nos detalhes (ou lista vazia), tenta o principal
                 if (passengersToNotify.length === 0) {
                     const phone = normalizePhone(trip.passenger_phone);
                     if (phone) {
                        passengersToNotify.push({
                            name: (trip.passenger_name || 'Passageiro').split(' ')[0],
                            phone: phone
                        });
                     }
                 }
             } else {
                 const phone = normalizePhone(trip.passenger_phone);
                 if (phone) {
                     passengersToNotify.push({
                         name: (trip.passenger_name || 'Passageiro').split(' ')[0],
                         phone: phone
                     });
                 }
             }
        } else if (actualTripType === 'Booking' || actualTripType === 'booking') {
            const phone = normalizePhone(trip.customer_phone);
            if (phone) {
                passengersToNotify.push({
                    name: (trip.customer_name || 'Passageiro').split(' ')[0],
                    phone: phone
                });
            }
        } else {
            // SupplierOwnBooking
            const phone = normalizePhone(trip.passenger_phone || trip.customer_phone);
            if (phone) {
                passengersToNotify.push({
                    name: (trip.passenger_name || trip.customer_name || 'Passageiro').split(' ')[0],
                    phone: phone
                });
            }
        }

        console.log(`[notifyDriverArrival] Found ${passengersToNotify.length} passengers to notify for trip ${tripId}`);

        // 4. Send Messages
        const results = [];
        for (const passenger of passengersToNotify) {
            const message = `Olá ${passenger.name}, seu motorista ${driverName} chegou ao local de embarque.`;
            
            try {
                // Invoke sendWhatsAppMessage
                // We use fireAndForget: false to ensure we log the result here, but we could optimize.
                const res = await base44.asServiceRole.functions.invoke('sendWhatsAppMessage', {
                    to: passenger.phone,
                    message: message
                });
                results.push({ phone: passenger.phone, success: true, data: res.data });
            } catch (err) {
                console.error(`[notifyDriverArrival] Error sending to ${passenger.phone}:`, err);
                results.push({ phone: passenger.phone, success: false, error: err.message });
            }
        }

        return Response.json({ success: true, results });

    } catch (error) {
        console.error('[notifyDriverArrival] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});