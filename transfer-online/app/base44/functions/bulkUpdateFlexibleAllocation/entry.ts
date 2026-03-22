import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Optional: Check specific permissions if needed (e.g. event manager)

        const { tripIds, isFlexible } = await req.json();

        if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
            return Response.json({ error: 'No trip IDs provided' }, { status: 400 });
        }

        // 1. Find all passengers associated with these trips
        // Using $in for efficiency
        const passengers = await base44.entities.EventPassenger.filter({
            event_trip_id: { $in: tripIds }
        });

        if (passengers.length === 0) {
            return Response.json({ success: true, count: 0, message: 'No passengers found in selected trips' });
        }

        // 2. Bulk update their status
        // Since we don't have a bulkUpdate method that takes a query, we iterate or use Promise.all
        // For better performance with many records, chunking might be needed, but for now Promise.all is okay for reasonable sizes
        
        const updatePromises = passengers.map(p => 
            base44.entities.EventPassenger.update(p.id, { 
                is_flexible_allocation: isFlexible 
            })
        );

        await Promise.all(updatePromises);

        // Also update the trips to indicate they are flexible (optional, but good for UI consistency)
        if (isFlexible) {
             const tripUpdatePromises = tripIds.map(tid => 
                base44.entities.EventTrip.update(tid, { is_flexible_vehicle: true })
            );
            await Promise.all(tripUpdatePromises);
        }

        return Response.json({ 
            success: true, 
            count: passengers.length,
            message: `Updated ${passengers.length} passengers to ${isFlexible ? 'flexible' : 'fixed'} allocation.` 
        });

    } catch (error) {
        console.error('Bulk update flexible allocation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});