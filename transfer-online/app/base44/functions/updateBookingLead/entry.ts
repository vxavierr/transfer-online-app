import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { lead_id, ...updates } = body;

    if (!lead_id) {
      return Response.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    // Ensure we only update allowed fields
    const allowedFields = [
      'vehicle_type_id', 
      'vehicle_type_name', 
      'calculated_price', 
      'distance_km', 
      'duration_minutes', 
      'status',
      'origin_flight_number',
      'destination_flight_number',
      'return_origin_flight_number',
      'return_destination_flight_number',
      'email'
    ];
    
    const dataToUpdate = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        dataToUpdate[key] = updates[key];
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
       return Response.json({ success: true, message: 'No fields to update' });
    }

    dataToUpdate.last_activity_at = new Date().toISOString();

    await base44.asServiceRole.entities.BookingLead.update(lead_id, dataToUpdate);

    return Response.json({ success: true });

  } catch (error) {
    console.error('[updateBookingLead] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});