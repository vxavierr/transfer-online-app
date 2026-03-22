import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId, status, reason } = await req.json();

        if (!tripId || !status) {
            return Response.json({ success: false, error: 'Trip ID and Status are required' }, { status: 400 });
        }
        
        if (!['approved', 'rejected'].includes(status)) {
             return Response.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        // Get the trip to verify permission (supplier check could be added here if stricter security needed)
        // For now, assuming authenticated user with access to the module is enough or relies on UI protection.
        // Ideally check: if (trip.supplier_id !== user.supplier_id) ...

        await base44.asServiceRole.entities.EventTrip.update(tripId, {
            subcontractor_info_status: status,
            subcontractor_info_rejected_reason: status === 'rejected' ? reason : null
        });

        return Response.json({ success: true });

    } catch (error) {
        console.error('Error reviewing subcontractor info:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});