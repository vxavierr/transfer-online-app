import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { parse, subHours, format } from 'npm:date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createResponse(data, init = {}) {
    return Response.json(data, {
        ...init,
        headers: {
            ...corsHeaders,
            ...(init.headers || {})
        }
    });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Setup
        // Debug headers
        const authHeader = req.headers.get('authorization');
        console.log('[createManualEventTrip] Request headers:', {
            hasAuth: !!authHeader,
            authLength: authHeader ? authHeader.length : 0,
            contentType: req.headers.get('content-type')
        });

        const base44 = createClientFromRequest(req);
        let user;
        
        try {
            user = await base44.auth.me();
        } catch (e) {
            console.error('[createManualEventTrip] Auth check failed:', e.message);
            // If auth.me() fails (e.g. 401 from backend), treat as unauthorized
            return createResponse({ error: 'Unauthorized', details: e.message }, { status: 401 });
        }

        if (!user) {
            console.error('[createManualEventTrip] No user found (null)');
            return createResponse({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Payload
        let payload;
        try {
            payload = await req.json();
        } catch (e) {
            console.error('[createManualEventTrip] JSON parse error', e);
            return createResponse({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { eventId, passengerIds, vehicleType, vehicleCapacity, clientPrice, pickupLeadTimeHours, tripType, partnerNotes, stops, additionalItems } = payload;

        console.log('[createManualEventTrip] Processing request:', {
            eventId,
            passengerCount: passengerIds?.length,
            vehicleType,
            vehicleCapacity,
            tripType,
            pickupLeadTimeHours,
            additionalItemsCount: additionalItems?.length
        });

        // 3. Validation
        if (!eventId) return createResponse({ error: 'Missing eventId' }, { status: 400 });
        
        // Allow creating empty trip (if passengerIds is empty or null, we need explicit trip details)
        const isTripEmpty = !passengerIds || !Array.isArray(passengerIds) || passengerIds.length === 0;
        
        if (isTripEmpty) {
            // Validate required fields for empty trip
            const { date, time, origin, destination } = payload;
            if (!date || !time || !origin || !destination) {
                return createResponse({ error: 'For empty trip, date, time, origin and destination are required' }, { status: 400 });
            }
        }

        if (!vehicleType) return createResponse({ error: 'Missing vehicleType' }, { status: 400 });

        // 4. Fetch Passengers
        const passengers = [];
        if (!isTripEmpty) {
            for (const id of passengerIds) {
                try {
                    const p = await base44.entities.EventPassenger.get(id);
                    if (p) passengers.push(p);
                    else console.warn(`[createManualEventTrip] Passenger ${id} not found`);
                } catch (e) {
                    console.error(`[createManualEventTrip] Error fetching passenger ${id}:`, e.message);
                }
            }

            if (passengers.length === 0) {
                return createResponse({ error: 'No valid passengers found from the provided list' }, { status: 404 });
            }
        }

        // 5. Create Trip
        let tripData = {};
        
        if (isTripEmpty) {
            const { date, time, origin, destination } = payload;

            // Generate Trip Code for Empty Trip
            let tripCode = '';
            try {
                const vType = String(vehicleType || 'Van').substring(0, 100);
                const safeEventId = String(eventId).trim();
                
                // Count existing trips for this date/vehicle to determine sequence
                // Note: This filter might need to be optimized if volume is high, but fine for now
                const existingTrips = await base44.entities.EventTrip.filter({
                    event_id: safeEventId,
                    date: date,
                    vehicle_type_category: vType
                });
                
                const sequence = existingTrips.length + 1;
                
                const vPrefix = vType.substring(0, 3).toUpperCase();
                const safeOrigin = String(origin || 'Indefinido').substring(0, 255);
                const oPrefix = safeOrigin.substring(0, 2).toUpperCase();
                
                let dSuffix = '0000';
                if (date) {
                    const [y, m, d] = date.split('-');
                    dSuffix = `${d}${m}`;
                }
                
                tripCode = `${vPrefix}${sequence}-${oPrefix}${dSuffix}`;
            } catch (e) {
                console.warn('[createManualEventTrip] Error generating trip code for empty trip:', e);
                tripCode = `EXTRA-${Date.now().toString().slice(-4)}`;
            }

            tripData = {
                event_id: eventId,
                name: `MN${time.replace(':','')} - 0 Pax`,
                trip_code: tripCode,
                status: 'planned',
                origin: origin,
                destination: destination,
                date: date,
                start_time: time,
                vehicle_type_category: vehicleType,
                vehicle_capacity: Number(vehicleCapacity) || 4,
                passenger_count: 0,
                client_price: Number(clientPrice) || 0,
                trip_type: tripType || 'transfer',
                notes: 'Viagem extra criada manualmente',
                partner_notes: partnerNotes || '',
                additional_stops: stops || [],
                additional_items: additionalItems || []
            };
        } else {
            const refPassenger = passengers[0];
            let pDate = refPassenger.date || refPassenger.flight_date || new Date().toISOString().split('T')[0];
            // Normalize date to YYYY-MM-DD
            try {
                if (!pDate) {
                    pDate = new Date().toISOString().split('T')[0];
                } else {
                    // Ensure it is a string
                    pDate = String(pDate);
                    if (pDate.includes('T')) pDate = pDate.split('T')[0];
                }
                
                // Validate date format YYYY-MM-DD
                if (!/^\d{4}-\d{2}-\d{2}$/.test(pDate)) {
                    console.warn(`[createManualEventTrip] Invalid date format: ${pDate}, defaulting to today`);
                    pDate = new Date().toISOString().split('T')[0];
                }
            } catch (e) {
                console.error('[createManualEventTrip] Date normalization error:', e);
                pDate = new Date().toISOString().split('T')[0];
            }

            const pTime = refPassenger.time || refPassenger.flight_time || '00:00';
            const pOrigin = refPassenger.arrival_point || refPassenger.origin_address || 'Indefinido';
            const pDestination = refPassenger.destination_address || 'Indefinido';

            // Ensure time is a string and formatted HH:MM
            let safeTime = String(pTime || '00:00');
            if (safeTime.length > 5) safeTime = safeTime.substring(0, 5);
            if (!/^\d{2}:\d{2}$/.test(safeTime)) safeTime = '00:00';

            // Calculate Pickup Time for OUT trips if lead time provided (positive or negative)
            const isOUT = refPassenger.trip_type === 'OUT' || (refPassenger.trip_type || '').toUpperCase().includes('OUT') || (refPassenger.trip_type || '').toUpperCase().includes('SAIDA');
            
            if (isOUT && pickupLeadTimeHours !== 0 && pickupLeadTimeHours !== undefined && pickupLeadTimeHours !== null) {
                try {
                    const flightTimeDate = parse(`${pDate} ${safeTime}`, 'yyyy-MM-dd HH:mm', new Date());
                    if (!isNaN(flightTimeDate.getTime())) {
                        const pickupDate = subHours(flightTimeDate, Number(pickupLeadTimeHours));
                        safeTime = format(pickupDate, 'HH:mm');
                        console.log(`[createManualEventTrip] Calculated pickup time: ${safeTime} (Flight: ${pTime}, Lead: ${pickupLeadTimeHours}h)`);
                    }
                } catch (e) {
                    console.warn('[createManualEventTrip] Error calculating pickup time:', e);
                }
            }

            const safeOrigin = String(pOrigin || 'Indefinido').substring(0, 255);
            const safeDestination = String(pDestination || 'Indefinido').substring(0, 255);
            
            // Sanitize eventId
            const safeEventId = String(eventId).trim();

            // Generate Trip Code
            let tripCode = '';
            try {
                // Count existing trips for this date/vehicle to determine sequence
                const vType = String(vehicleType || 'Van').substring(0, 100);
                const existingTrips = await base44.entities.EventTrip.filter({
                    event_id: safeEventId,
                    date: pDate,
                    vehicle_type_category: vType
                });
                
                const sequence = existingTrips.length + 1;
                
                const vPrefix = vType.substring(0, 3).toUpperCase();
                const oPrefix = safeOrigin.substring(0, 2).toUpperCase();
                
                let dSuffix = '0000';
                if (pDate) {
                    const [y, m, d] = pDate.split('-');
                    dSuffix = `${d}${m}`;
                }
                
                tripCode = `${vPrefix}${sequence}-${oPrefix}${dSuffix}`;
            } catch (e) {
                console.warn('[createManualEventTrip] Error generating trip code:', e);
                tripCode = `M-${Date.now().toString().slice(-4)}`;
            }

            tripData = {
                event_id: safeEventId,
                name: `MN${safeTime.replace(':','')} - ${passengers.length} Pax`,
                trip_code: tripCode,
                status: 'planned',
                origin: safeOrigin,
                destination: safeDestination,
                date: pDate,
                start_time: safeTime,
                vehicle_type_category: String(vehicleType || 'Van').substring(0, 100),
                vehicle_capacity: Math.max(1, parseInt(vehicleCapacity) || 4), // Ensure positive integer
                passenger_count: Math.max(0, parseInt(passengers.length) || 0), // Ensure non-negative integer
                client_price: Number(clientPrice) || 0,
                trip_type: tripType || (isOUT ? 'departure' : 'arrival'),
                notes: `Viagem criada manualmente.${isOUT && pickupLeadTimeHours ? ` Ajuste pickup: ${pickupLeadTimeHours}h.` : ''}`,
                partner_notes: partnerNotes || '',
                additional_items: additionalItems || []
            };
        }

        console.log('[createManualEventTrip] Creating trip:', tripData);
        
        let createdTrip;
        try {
            // Ensure numeric values are integers
            tripData.vehicle_capacity = parseInt(tripData.vehicle_capacity) || 4;
            tripData.passenger_count = parseInt(tripData.passenger_count) || 0;

            console.log('[createManualEventTrip] Final tripData:', JSON.stringify(tripData));
            createdTrip = await base44.entities.EventTrip.create(tripData);
        } catch (e) {
            console.error('[createManualEventTrip] Error creating trip entity:', e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            // Log extended details
            if (e.response) console.error('Error Response:', e.response);
            if (e.data) console.error('Error Data:', e.data);
            
            return createResponse({ 
                error: `Failed to create trip: ${errorMessage}`, 
                details: JSON.stringify(e, Object.getOwnPropertyNames(e))
            }, { status: 500 });
        }

        // 6. Update Passengers
        let updatedCount = 0;
        for (const p of passengers) {
            try {
                await base44.entities.EventPassenger.update(p.id, {
                    event_trip_id: createdTrip.id,
                    status: 'assigned'
                });
                updatedCount++;
            } catch (e) {
                console.error(`[createManualEventTrip] Error updating passenger ${p.id}:`, e.message);
            }
        }

        return createResponse({ 
            success: true, 
            tripId: createdTrip.id, 
            updatedCount,
            message: 'Trip created successfully'
        });

    } catch (error) {
        console.error('[createManualEventTrip] Unexpected error:', error);
        
        // Comprehensive check for 401
        let status = 500;
        if (error.status === 401) status = 401;
        else if (error.response?.status === 401) status = 401;
        else if (error.message && (
            error.message.includes('Authentication required') || 
            error.message.includes('Unauthorized')
        )) status = 401;
        else if (error.data?.message && (
            error.data.message.includes('Authentication required') ||
            error.data.message.includes('Unauthorized')
        )) status = 401;
        
        return createResponse({ 
            error: status === 401 ? 'Unauthorized' : 'Internal Server Error',
            message: error.message || error.data?.message || 'Unknown error'
        }, { status });
    }
});