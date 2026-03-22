import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId, passengerIds } = await req.json();

        if (!tripId) {
            return Response.json({ error: 'Trip ID is required' }, { status: 400 });
        }

        // Fetch Trip Data
        const trip = await base44.entities.EventTrip.get(tripId);
        if (!trip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Fetch Event Data for context
        const event = await base44.entities.Event.get(trip.event_id);

        // Fetch Passengers
        // Always fetch ALL passengers for context (group analysis)
        const allTripPassengers = await base44.entities.EventPassenger.filter({ event_trip_id: tripId }, {}, 200);
        
        let targetPassengers = [];
        if (passengerIds && passengerIds.length > 0) {
             targetPassengers = allTripPassengers.filter(p => passengerIds.includes(p.id));
        } else {
            targetPassengers = allTripPassengers;
        }

        if (targetPassengers.length === 0) {
            return Response.json({ error: 'No passengers found' }, { status: 404 });
        }

        // Group Analysis
        const allFlights = allTripPassengers
            .map(p => ({
                flight: p.flight_number ? p.flight_number.trim() : null,
                time: p.flight_time || p.time || "00:00",
                date: p.flight_date || p.date || trip.date
            }))
            .filter(f => f.flight);

        const uniqueFlightStrings = [...new Set(allFlights.map(f => f.flight))];
        const isGroupedWithDifferentFlights = uniqueFlightStrings.length > 1;
        
        let latestArrivalTimeStr = null;
        if (isGroupedWithDifferentFlights) {
            let latestDate = null;
            allFlights.forEach(f => {
                const [h, m] = f.time.split(':').map(Number);
                const flightDateStr = f.date || trip.date;
                const d = new Date(`${flightDateStr}T${f.time}:00`);
                if (!latestDate || d > latestDate) {
                    latestDate = d;
                }
            });
            if (latestDate) {
                latestArrivalTimeStr = "Após chegada de todos";
            }
        }

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
            } catch (e) {
                console.warn('Driver not found', e);
            }
        }
        
        // Se ainda não tiver info do veículo específica (ou seja, não é eventual nem subcontratado com dados), tenta pegar do veículo cadastrado
        if ((vehicleInfo === "A definir" || vehicleInfo === trip.vehicle_type_category) && trip.vehicle_id) {
             try {
                const vehicle = await base44.entities.DriverVehicle.get(trip.vehicle_id);
                if (vehicle) {
                    // Correct field names: vehicle_model and vehicle_plate
                    const model = vehicle.vehicle_model || vehicle.model || "Veículo";
                    const plate = vehicle.vehicle_plate || vehicle.plate || "";
                    vehicleInfo = `${model} ${plate ? `(${plate})` : ''}`;
                }
            } catch (e) {
                console.warn('Vehicle not found', e);
            }
        }

        let coordinatorContact = null;
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

        const appUrl = Deno.env.get('BASE_URL') || 'https://app.base44.com';
        
        // Return raw data only, NO image generation here
        const boardingPasses = targetPassengers.map((p) => {
            const checkinUrl = `${appUrl}/checkin?tripId=${tripId}&passengerId=${p.id}`;
            
            // IMPORTANTE: Usar o horário individual do passageiro (voo/chegada), não o horário da viagem
            const passengerTime = p.time || p.flight_time || trip.start_time;
            
            return {
                passenger_name: p.passenger_name,
                passenger_id: p.id,
                event_name: event ? event.event_name : "Transfer Evento",
                date: p.date || p.flight_date || trip.date,
                time: passengerTime,
                origin: trip.origin,
                destination: trip.destination,
                additional_stops: trip.additional_stops || [],
                driver_name: driverName,
                driver_phone: driverPhone,
                vehicle_info: vehicleInfo,
                coordinator_contact: coordinatorContact,
                checkin_url: checkinUrl,
                trip_name: trip.name,
                is_flexible_allocation: p.is_flexible_allocation || trip.is_flexible_vehicle || false,
                
                // Group Info
                is_grouped_trip: isGroupedWithDifferentFlights,
                group_flights: uniqueFlightStrings,
                estimated_group_departure: latestArrivalTimeStr
            };
        });

        return Response.json({
            success: true,
            data: boardingPasses
        });

    } catch (error) {
        console.error('Error fetching boarding pass data:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
}