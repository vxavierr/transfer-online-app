import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, ...payload } = await req.json();

    if (action === 'initSession') {
        const { driverId, tripId } = payload;
        
        // Check if active session exists
        const existing = await base44.entities.TelemetrySession.filter({
            trip_id: tripId,
            status: 'active'
        });
        
        if (existing.length > 0) {
            return Response.json({ success: true, sessionId: existing[0].id });
        }

        const session = await base44.entities.TelemetrySession.create({
            driver_id: driverId,
            trip_id: tripId,
            start_time: new Date().toISOString(),
            status: 'active',
            safety_score: 100
        });

        // Log start event
        await base44.entities.TelemetryEvent.create({
            session_id: session.id,
            type: 'trip_start',
            timestamp: new Date().toISOString(),
            latitude: 0, 
            longitude: 0,
            speed: 0
        });

        return Response.json({ success: true, sessionId: session.id });
    }

    if (action === 'logBatch') {
        const { sessionId, events, currentStats } = payload;
        
        // Bulk create events
        if (events && events.length > 0) {
            // Add session_id to all events
            const eventsToCreate = events.map(e => ({
                ...e,
                session_id: sessionId
            }));
            await base44.entities.TelemetryEvent.bulkCreate(eventsToCreate);

            // Update Trip Location (Sync for Dashboard Map)
            try {
                // Find latest location in events
                const locEvents = events.filter(e => e.latitude && e.longitude && e.latitude !== 0);
                if (locEvents.length > 0) {
                    // Sort by timestamp to get latest
                    locEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    const lastLoc = locEvents[locEvents.length - 1];
                    
                    // Get session to find trip_id
                    // Using asServiceRole to ensure we can read session and update trip regardless of user permissions
                    const session = await base44.asServiceRole.entities.TelemetrySession.get(sessionId);
                    
                    if (session && session.trip_id) {
                        const updateData = {
                            current_location_lat: lastLoc.latitude,
                            current_location_lon: lastLoc.longitude,
                            location_last_updated_at: new Date().toISOString(),
                            gps_tracking_enabled: true,
                            // Optional: update ETA if needed here, but keeping it simple for now
                        };

                        // Try updating ServiceRequest
                        try {
                            await base44.asServiceRole.entities.ServiceRequest.update(session.trip_id, updateData);
                        } catch (e) {
                            // If fails (e.g. not found), try SupplierOwnBooking
                            try {
                                await base44.asServiceRole.entities.SupplierOwnBooking.update(session.trip_id, updateData);
                            } catch (e2) {
                                // Try Booking
                                try {
                                    await base44.asServiceRole.entities.Booking.update(session.trip_id, updateData);
                                } catch (e3) { /* Ignore */ }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Error syncing location to trip:', err);
            }
        }

        // Update session stats if provided
        if (currentStats) {
            // Calculate current score locally just for live update (simplified)
            let score = 100;
            score -= ((currentStats.totalHardBrakes || 0) * 5);
            score -= ((currentStats.totalSharpTurns || 0) * 3);
            score -= ((currentStats.totalSpeedingEvents || 0) * 10);
            if (score < 0) score = 0;

            await base44.entities.TelemetrySession.update(sessionId, {
                max_speed: currentStats.maxSpeed,
                distance_km: currentStats.distanceKm,
                total_hard_brakes: currentStats.totalHardBrakes || 0,
                total_speeding_events: currentStats.totalSpeedingEvents || 0,
                total_sharp_turns: currentStats.totalSharpTurns || 0,
                safety_score: score,
                updated_date: new Date().toISOString()
            });
        }

        return Response.json({ success: true });
    }

    if (action === 'finalizeSession') {
        const { sessionId, finalStats } = payload;
        
        const events = await base44.entities.TelemetryEvent.filter({ session_id: sessionId });
        
        // Calculate metrics from events if not provided or to verify
        const hardBrakes = events.filter(e => e.type === 'hard_brake').length;
        const sharpTurns = events.filter(e => e.type === 'sharp_turn').length;
        const speeding = events.filter(e => e.type === 'speeding').length;
        
        // Reconstruct stats from events as fallback
        let calculatedDistance = 0;
        let calculatedMaxSpeed = 0;
        
        const sortedEvents = events.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        if (sortedEvents.length > 1) {
            for(let i=1; i<sortedEvents.length; i++) {
                const prev = sortedEvents[i-1];
                const curr = sortedEvents[i];
                if(prev.latitude && prev.longitude && curr.latitude && curr.longitude && prev.latitude !== 0) {
                     calculatedDistance += getDistanceFromLatLonInKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
                }
                if(curr.speed > calculatedMaxSpeed) calculatedMaxSpeed = curr.speed;
            }
        }
        
        // Use finalStats if available (more accurate), otherwise fallback to calculated
        const finalDistance = (finalStats?.distanceKm !== undefined && finalStats?.distanceKm !== null) ? finalStats.distanceKm : calculatedDistance;
        const finalMaxSpeed = (finalStats?.maxSpeed !== undefined && finalStats?.maxSpeed !== null) ? finalStats.maxSpeed : calculatedMaxSpeed;
        
        // Calculate basic score
        // Start with 100, deduct for events
        let score = 100;
        score -= (hardBrakes * 5);
        score -= (sharpTurns * 3);
        score -= (speeding * 10);
        if (score < 0) score = 0;

        await base44.entities.TelemetrySession.update(sessionId, {
            status: 'completed',
            end_time: new Date().toISOString(),
            safety_score: score,
            total_hard_brakes: hardBrakes,
            total_sharp_turns: sharpTurns,
            total_speeding_events: speeding,
            distance_km: Number(finalDistance.toFixed(2)),
            max_speed: Number(finalMaxSpeed.toFixed(1)),
            avg_speed: finalStats?.avgSpeed || 0
        });

        return Response.json({ success: true, score, recoveredDistance: calculatedDistance });
    }

    if (action === 'checkSpeedLimit') {
        const { latitude, longitude } = payload;
        const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
        
        if (!apiKey) {
            return Response.json({ error: 'API Key not configured' }, { status: 500 });
        }

        try {
            // Using Google Roads API (Speed Limits)
            // Note: This requires the 'Roads API' to be enabled in Google Cloud Console
            const url = `https://roads.googleapis.com/v1/speedLimits?path=${latitude},${longitude}&key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.speedLimits && data.speedLimits.length > 0) {
                return Response.json({ 
                    success: true, 
                    limit: data.speedLimits[0].speedLimit,
                    units: 'KPH' // Google API returns in KPH usually, check docs if units param needed (defaults to KPH)
                });
            } else {
                return Response.json({ success: true, limit: null }); // No limit data found
            }
        } catch (err) {
            console.error('Speed Limit API Error:', err);
            return Response.json({ success: false, limit: null });
        }
    }

    if (action === 'getDriverStats') {
        const { driverId } = payload;
        // Simple aggregation - fetch ALL sessions, not just completed
        const sessions = await base44.entities.TelemetrySession.filter({ driver_id: driverId });
        
        let totalScore = 0;
        let totalDistance = 0;
        let totalIncidents = 0;
        
        sessions.forEach(s => {
            totalScore += (s.safety_score || 0);
            totalDistance += (s.distance_km || 0);
            totalIncidents += ((s.total_hard_brakes||0) + (s.total_sharp_turns||0) + (s.total_speeding_events||0));
        });

        const avgScore = sessions.length > 0 ? (totalScore / sessions.length).toFixed(1) : 100;

        // Feedback Generation based on stats
        const feedback = [];
        if (avgScore < 90) feedback.push("Sua pontuação geral está abaixo da média. Foque em suavizar a condução.");
        
        const hardBrakes = sessions.reduce((acc, s) => acc + (s.total_hard_brakes || 0), 0);
        const speeding = sessions.reduce((acc, s) => acc + (s.total_speeding_events || 0), 0);
        
        if (hardBrakes > sessions.length * 0.5) feedback.push("Alto número de frenagens bruscas. Mantenha maior distância de seguimento.");
        if (speeding > sessions.length * 0.5) feedback.push("Excesso de velocidade detectado frequentemente. Respeite os limites da via.");
        if (feedback.length === 0) feedback.push("Excelente condução! Continue assim.");

        return Response.json({
            avgScore,
            totalTrips: sessions.length,
            totalDistance: totalDistance.toFixed(1),
            totalIncidents,
            feedback,
            sessions: sessions.sort((a,b) => new Date(b.start_time) - new Date(a.start_time))
        });
    }

    if (action === 'getDriverRanking') {
        // Fetch all drivers and their sessions (Warning: heavy operation for large datasets, should be optimized/cached in real prod)
        const drivers = await base44.entities.Driver.list();
        const allSessions = await base44.entities.TelemetrySession.list(); // Limit?
        
        const ranking = drivers.map(driver => {
            const driverSessions = allSessions.filter(s => s.driver_id === driver.id);
            if (driverSessions.length === 0) return null;

            const totalScore = driverSessions.reduce((acc, s) => acc + (s.safety_score || 0), 0);
            const totalDistance = driverSessions.reduce((acc, s) => acc + (s.distance_km || 0), 0);
            const avgScore = (totalScore / driverSessions.length) || 0;

            return {
                driverId: driver.id,
                driverName: driver.name,
                photoUrl: driver.photo_url,
                avgScore: Number(avgScore.toFixed(1)),
                totalTrips: driverSessions.length,
                totalDistance: Number(totalDistance.toFixed(1))
            };
        }).filter(Boolean).sort((a, b) => b.avgScore - a.avgScore); // Sort by score DESC

        return Response.json({ ranking });
    }

    if (action === 'getIncidentHotspots') {
        // Fetch recent incident events
        // Filter by types that matter for hotspots
        // This is a heavy query if we don't limit by date. Let's limit to last 30 days if possible or just fetch last N events.
        // Since we can't complex filter date easily without iterating, let's fetch list.
        const events = await base44.entities.TelemetryEvent.filter({ 
            // type: { $in: ['hard_brake', 'sharp_turn', 'speeding'] } // SDK might not support $in directly depending on version, let's fetch all or filter client side
        }, '-timestamp', 500); // Last 500 events

        const incidents = events.filter(e => ['hard_brake', 'sharp_turn', 'speeding'].includes(e.type)).map(e => ({
            type: e.type,
            lat: e.latitude,
            lng: e.longitude,
            value: e.value,
            timestamp: e.timestamp
        }));

        return Response.json({ incidents });
    }

    if (action === 'getDriverReport') {
        const { driverId, days = 30 } = payload;
        // Fetch sessions for driver
        const sessions = await base44.entities.TelemetrySession.filter({ driver_id: driverId }, '-start_time', 100);
        
        // Group by day
        const dailyStats = {};
        
        sessions.forEach(s => {
            const date = s.start_time.split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = { date, scoreSum: 0, count: 0, distance: 0, incidents: 0 };
            }
            dailyStats[date].scoreSum += (s.safety_score || 0);
            dailyStats[date].count += 1;
            dailyStats[date].distance += (s.distance_km || 0);
            dailyStats[date].incidents += ((s.total_hard_brakes||0) + (s.total_sharp_turns||0) + (s.total_speeding_events||0));
        });

        const chartData = Object.values(dailyStats).map(d => ({
            date: d.date,
            avgScore: Number((d.scoreSum / d.count).toFixed(1)),
            totalDistance: Number(d.distance.toFixed(1)),
            totalIncidents: d.incidents
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        return Response.json({ chartData });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});