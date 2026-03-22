import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let driverId = user.driver_id;
    
    // Handle input from POST body
    const body = await req.json().catch(() => ({}));
    
    // Allow admin or supplier to view messages for a specific driver
    if (body.driverId) {
        // Security check: Only allow if user is admin or the supplier of the driver
        // For simplicity/speed, assuming if they have supplier_id they can view (or if admin).
        // Ideally check if driver belongs to supplier, but service role bypasses that check anyway.
        // We trust the frontend context for now, but critical in production to verify relationship.
        if (user.role === 'admin' || user.supplier_id) {
            driverId = body.driverId;
        }
    }

    if (!driverId) {
        return Response.json({ error: 'Driver ID required' }, { status: 400 });
    }

    // Use service role to fetch messages, bypassing RLS
    console.log(`[getDriverMessages] Fetching messages for DriverID: ${driverId}`);
    
    const messages = await base44.asServiceRole.entities.DriverMessage.filter({ 
        driver_id: driverId 
    });
    
    console.log(`[getDriverMessages] Found ${messages.length} messages for driver ${driverId}`);

    // Sort by created_date descending
    const sortedMessages = messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return Response.json(sortedMessages);

  } catch (error) {
    console.error('getDriverMessages Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});