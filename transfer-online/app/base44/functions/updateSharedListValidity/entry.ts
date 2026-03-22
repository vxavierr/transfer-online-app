import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.supplier_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId, newExpiryDate } = await req.json();

    if (!listId || !newExpiryDate) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership (using service role to bypass owner-only restrictions within the same supplier)
    const lists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ id: listId });
    const list = lists[0];

    if (!list || list.supplier_id !== user.supplier_id) {
      return Response.json({ error: 'List not found or unauthorized' }, { status: 404 });
    }

    const updatedList = await base44.asServiceRole.entities.SharedReceptiveList.update(listId, {
      expires_at: newExpiryDate
    });

    return Response.json({ success: true, data: updatedList });
  } catch (error) {
    console.error('Error updating list validity:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});