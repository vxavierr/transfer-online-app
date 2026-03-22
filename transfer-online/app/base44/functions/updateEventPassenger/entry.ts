import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { passengerId, data } = await req.json();

    if (!passengerId || !data) {
      return Response.json({ error: 'Passenger ID and data are required' }, { status: 400 });
    }

    // Get current passenger to check permissions (via event)
    const passenger = await base44.entities.EventPassenger.get(passengerId);
    if (!passenger) {
      return Response.json({ error: 'Passenger not found' }, { status: 404 });
    }

    const event = await base44.entities.Event.get(passenger.event_id);
    if (!event) {
        return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Permission check
    const isAdmin = user.role === 'admin';
    const isOwnerSupplier = user.supplier_id && event.supplier_id === user.supplier_id;
    const isEventManager = user.event_access_active && event.manager_user_id === user.id;

    if (!isAdmin && !isOwnerSupplier && !isEventManager) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update passenger
    // Whitelist allowed fields to prevent overwriting system fields like id, created_at
    const allowedFields = [
        'passenger_name', 
        'document_id', 
        'passenger_email', 
        'passenger_phone', 
        'passenger_city_origin', 
        'date', 
        'time', 
        'trip_type', 
        'origin_address', 
        'destination_address', 
        'flight_number', 
        'airline',
        'arrival_point',
        'is_flexible_allocation',
        'is_companion',
        'main_passenger_id',
        'companion_relationship',
        'tags'
    ];

    // Função auxiliar para normalizar texto (Title Case)
    const normalizeText = (text) => {
        if (!text || typeof text !== 'string') return text;
        return text.trim().toLowerCase().split(/\s+/).map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };

    const cleanData = {};
    Object.keys(data).forEach(key => {
        if (allowedFields.includes(key)) {
            let value = data[key];
            
            // Normalização de dados
            if (typeof value === 'string') {
                if (['passenger_name', 'passenger_city_origin', 'origin_address', 'destination_address', 'arrival_point', 'airline', 'companion_relationship'].includes(key)) {
                    value = normalizeText(value);
                } else if (key === 'passenger_email') {
                    value = value.toLowerCase().trim();
                } else if (key === 'flight_number') {
                    value = value.toUpperCase().trim();
                } else if (key === 'document_id') {
                    value = value.replace(/\D/g, '');
                }
            }
            
            cleanData[key] = value;
        }
    });

    const updatedPassenger = await base44.entities.EventPassenger.update(passengerId, cleanData);

    return Response.json({ success: true, data: updatedPassenger });

  } catch (error) {
    console.error('Error updating passenger:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});