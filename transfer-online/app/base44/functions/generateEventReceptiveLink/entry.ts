import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        console.log('[generateEventReceptiveLink] Request body:', JSON.stringify(body));
        
        const { eventId, tripIds, coordinatorName, coordinatorContact, expiresAt, linkType = "coordinator" } = body;

        if (!eventId || !tripIds || tripIds.length === 0) {
            return Response.json({ error: 'Event ID and Trip IDs are required' }, { status: 400 });
        }

        // Generate a secure random token
        const token = crypto.randomUUID();

        const supplierId = user.supplier_id;
        if (!supplierId) {
             return Response.json({ error: 'User must be a supplier' }, { status: 403 });
        }

        const expiresAtValue = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        console.log('[generateEventReceptiveLink] Creating shared list with:', {
            token,
            supplierId,
            userId: user.id,
            eventId,
            tripIdsCount: tripIds.length,
            expiresAt: expiresAtValue,
            linkType
        });

        // Create SharedReceptiveList using service role
        const sharedList = await base44.asServiceRole.entities.SharedReceptiveList.create({
            token: token,
            supplier_id: supplierId,
            generated_by_user_id: user.id,
            event_id: eventId,
            event_trip_ids: tripIds,
            expires_at: expiresAtValue,
            share_type: "both",
            link_type: linkType === "client_dashboard" ? "client_dashboard" : "coordinator",
            shared_at: new Date().toISOString(),
            coordinator_name: coordinatorName || null,
            coordinator_contact: coordinatorContact || null,
            active: true
        });
        
        console.log('[generateEventReceptiveLink] Shared list created:', sharedList.id);

        // Generate Link based on type
        const appUrl = Deno.env.get('BASE_URL') || 'https://app.base44.com';
        const pageName = linkType === "client_dashboard" ? "EventClientDashboard" : "ReceptiveListEventView";
        const link = `${appUrl}/${pageName}?token=${token}`;
        
        console.log(`[generateEventReceptiveLink] Generated ${linkType} link: ${link}`);

        return Response.json({
            success: true,
            link: link,
            token: token,
            linkType: linkType,
            sharedList: sharedList
        });

    } catch (error) {
        console.error('[generateEventReceptiveLink] Full error:', error);
        console.error('[generateEventReceptiveLink] Error stack:', error.stack);
        console.error('[generateEventReceptiveLink] Error message:', error.message);
        return Response.json({ 
            error: error.message || 'Unknown error',
            details: error.stack,
            type: error.name
        }, { status: 500 });
    }
});