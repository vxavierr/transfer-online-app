import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId } = await req.json();

        if (!tripId) {
            return Response.json({ error: 'Trip ID is required' }, { status: 400 });
        }

        const trip = await base44.entities.EventTrip.get(tripId);
        if (!trip) {
            return Response.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Calculate ETA using Google Maps
        const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
        if (!googleMapsApiKey) {
            return Response.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
        }

        if (!trip.origin || !trip.destination) {
             return Response.json({ error: 'Origin and Destination are required for ETA' }, { status: 400 });
        }

        const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
        url.searchParams.append('origins', trip.origin);
        url.searchParams.append('destinations', trip.destination);
        url.searchParams.append('mode', 'driving');
        url.searchParams.append('departure_time', 'now');
        url.searchParams.append('traffic_model', 'best_guess');
        url.searchParams.append('key', googleMapsApiKey);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status !== 'OK' || !data.rows[0]?.elements[0] || data.rows[0].elements[0].status !== 'OK') {
             return Response.json({ error: 'Failed to calculate ETA with Google Maps', details: data }, { status: 500 });
        }

        const element = data.rows[0].elements[0];
        const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0;
        const durationText = element.duration_in_traffic?.text || element.duration?.text;
        
        // Calculate arrival time
        const now = new Date();
        const etaDate = new Date(now.getTime() + (durationSeconds * 1000));
        const currentEtaMinutes = Math.round(durationSeconds / 60);

        // Update Trip
        const updateData = {
            estimated_arrival_time: etaDate.toISOString(),
            eta_duration_text: durationText,
            current_eta_minutes: currentEtaMinutes,
            eta_last_calculated_at: now.toISOString()
        };

        await base44.entities.EventTrip.update(tripId, updateData);

        return Response.json({ 
            success: true, 
            data: updateData
        });

    } catch (error) {
        console.error('Refresh ETA error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});