import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, full_name, email, phone_number } = await req.json();

    const targetClientId = client_id || user.client_id;
    if (!targetClientId || !full_name) {
      return Response.json({ success: false, error: 'Dados insuficientes para sincronizar solicitante' }, { status: 400 });
    }

    if (user.role !== 'admin' && user.client_id !== targetClientId) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.FrequentRequester.list();
    const match = existing.find((item) => item.client_id === targetClientId && item.email && email && item.email.toLowerCase() === email.toLowerCase());

    let requester;
    if (match) {
      requester = await base44.asServiceRole.entities.FrequentRequester.update(match.id, {
        full_name,
        email: email || match.email,
        phone_number: phone_number || match.phone_number,
      });
    } else {
      requester = await base44.asServiceRole.entities.FrequentRequester.create({
        client_id: targetClientId,
        full_name,
        email: email || '',
        phone_number: phone_number || '',
      });
    }

    return Response.json({ success: true, requester });
  } catch (error) {
    console.error('[syncFrequentRequester] Error:', error);
    return Response.json({ success: false, error: error.message || 'Erro ao sincronizar solicitante' }, { status: 500 });
  }
});