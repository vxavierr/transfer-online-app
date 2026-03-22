import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId, additionalItems } = await req.json();

    if (!tripId) {
      return Response.json({ error: 'tripId is required' }, { status: 400 });
    }

    if (!Array.isArray(additionalItems)) {
        return Response.json({ error: 'additionalItems must be an array' }, { status: 400 });
    }

    // Check if trip exists
    const trip = await base44.entities.EventTrip.get(tripId);
    if (!trip) {
        return Response.json({ error: `EventTrip not found: ${tripId}` }, { status: 404 });
    }

    // Validate items structure
    const validItems = additionalItems.map(item => ({
        name: item.name || 'Item sem nome',
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        total_price: (parseInt(item.quantity) || 1) * (parseFloat(item.unit_price) || 0),
        notes: item.notes || ''
    }));

    await base44.entities.EventTrip.update(tripId, {
        additional_items: validItems,
        // Also update final price if needed, but usually handled by triggers or recalculation
        // final_supplier_cost should include these items
    });

    // Optionally recalculate costs (simple version)
    const itemsTotal = validItems.reduce((sum, item) => sum + item.total_price, 0);
    // You might want to update final_supplier_cost here or in another function
    // For now, just saving the items as requested.

    return Response.json({ success: true, message: 'Itens adicionais atualizados com sucesso.' });

  } catch (error) {
    console.error('Error updating additional items:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});