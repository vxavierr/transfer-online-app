import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import webPush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Configurar VAPID
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const subject = 'mailto:admin@transferonline.com.br'; // Email de contato obrigatório para VAPID

    if (!publicKey || !privateKey) {
      console.error('[sendPushNotification] Chaves VAPID não configuradas');
      return Response.json({ error: 'Serviço de push não configurado (VAPID keys missing)' }, { status: 500 });
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);

    // Parse do body
    const body = await req.json();
    const {
      userId,
      title,
      message,
      data,
      icon,
      badge,
      tag
    } = body;

    if (!userId || !title || !message) {
      return Response.json({ 
        error: 'userId, title e message são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar subscrições do usuário
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_id: userId
    });

    if (subscriptions.length === 0) {
      console.log(`[sendPushNotification] Nenhuma subscrição encontrada para user ${userId}`);
      return Response.json({ success: false, message: 'Usuário não possui dispositivos registrados para push' });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: icon || 'https://cdn-icons-png.flaticon.com/512/1048/1048315.png',
      badge: badge || 'https://cdn-icons-png.flaticon.com/512/1048/1048315.png',
      data: data || {},
      tag: tag
    });

    const results = [];

    // Enviar para todas as subscrições
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: sub.keys
        };

        // Adicionar options com TTL e urgência para garantir entrega em background/app fechado
        const options = {
          TTL: 86400, // 24 horas
          urgency: 'high'
        };
        await webPush.sendNotification(pushSubscription, payload, options);
        results.push({ id: sub.id, status: 'success' });
      } catch (err) {
        console.error(`[sendPushNotification] Erro ao enviar para sub ${sub.id}:`, err);
        
        // Se deu erro 410 (Gone) ou 404, a subscrição é inválida e deve ser removida
        if (err.statusCode === 410 || err.statusCode === 404) {
          try {
            await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
            results.push({ id: sub.id, status: 'deleted_expired' });
          } catch (delErr) {
            console.error('Erro ao deletar subscrição expirada:', delErr);
          }
        } else {
          results.push({ id: sub.id, status: 'error', error: err.message });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Notificação processada para ${subscriptions.length} dispositivos`,
      results
    });

  } catch (error) {
    console.error('[sendPushNotification] Erro geral:', error);
    return Response.json({
      error: error.message || 'Erro ao enviar notificação'
    }, { status: 500 });
  }
});