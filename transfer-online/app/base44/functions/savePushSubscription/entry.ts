import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription, deviceInfo } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return Response.json({ error: 'Dados de inscrição inválidos' }, { status: 400 });
    }

    // Verifica se já existe
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({
      endpoint: subscription.endpoint
    });

    if (existing.length > 0) {
      // Atualiza se necessário (ex: user_id mudou)
      if (existing[0].user_id !== user.id) {
        await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, {
          user_id: user.id,
          device_info: deviceInfo || existing[0].device_info
        });
      }
      return Response.json({ success: true, message: 'Subscription updated' });
    }

    // Cria nova
    await base44.asServiceRole.entities.PushSubscription.create({
      user_id: user.id,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      device_info: deviceInfo
    });

    return Response.json({ success: true, message: 'Subscription saved' });

  } catch (error) {
    console.error('[savePushSubscription] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});