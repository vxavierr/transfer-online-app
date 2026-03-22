import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || !user.is_driver) {
      return Response.json({ error: 'Unauthorized - Motorista não autenticado' }, { status: 401 });
    }

    const { serviceRequestId } = await req.json();

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    const requests = await base44.asServiceRole.entities.ServiceRequest.filter({ id: serviceRequestId });
    
    if (requests.length === 0) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const request = requests[0];

    // Verificar se o motorista tem acesso a esta viagem (verificar pelo telefone)
    if (request.driver_phone !== user.phone_number) {
      return Response.json({ error: 'Você não tem permissão para acessar esta viagem' }, { status: 403 });
    }

    // Marcar a viagem como reconhecida pelo motorista
    await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, {
      driver_acknowledged_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      message: 'Viagem marcada como reconhecida'
    });
  } catch (error) {
    console.error('[acknowledgeDriverTrip] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});