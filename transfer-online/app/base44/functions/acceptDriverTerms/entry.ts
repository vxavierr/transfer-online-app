import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { termsVersion, token, email } = await req.json();
    
    let driverId;
    let driverData;
    let user;

    if (token) {
      // Fluxo por Token
      // Usar Service Role para buscar motorista pelo token (pois não temos usuário logado ou permissão de listagem pública)
      const drivers = await base44.asServiceRole.entities.Driver.filter({
        terms_token: token
      });

      if (drivers.length === 0) {
        return Response.json({ error: 'Token inválido ou expirado' }, { status: 404 });
      }

      driverData = drivers[0];
      driverId = driverData.id;

    } else {
      // Fluxo por Autenticação (padrão)
      user = await base44.auth.me();
      if (!user || !user.is_driver || !user.driver_id) {
        return Response.json({ error: 'Acesso não autorizado' }, { status: 401 });
      }
      driverId = user.driver_id;
      // Buscar dados para garantir que existe
      driverData = await base44.entities.Driver.get(driverId);
    }

    if (!driverData) {
       return Response.json({ error: 'Motorista não encontrado' }, { status: 404 });
    }

    // Obter o IP do motorista
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'IP não disponível';

    const now = new Date().toISOString();

    // 1. Atualizar e ATIVAR o registro do motorista
    // Se for por token, usar service role, pois não há usuário autenticado com permissão
    const sdk = token ? base44.asServiceRole : base44;

    const updatedDriver = await sdk.entities.Driver.update(driverId, {
      terms_accepted_at: now,
      terms_version: termsVersion || 'v1.0',
      terms_acceptance_ip: clientIp,
      active: true, // Ativar automaticamente após aceite
      approval_status: 'approved', // Garantir status aprovado
      terms_token: null // Invalidar o token após uso para segurança
    });

    // 2. Buscar e concluir o convite associado (se houver)
    const driverEmail = updatedDriver.email || user?.email;
    
    if (driverEmail) {
      // Usar service role para buscar convites, pois o driver não autenticado pode não ter permissão
      const invitations = await base44.asServiceRole.entities.EmployeeInvitation.filter({
        email: driverEmail,
        supplier_id: updatedDriver.supplier_id,
        status: { $in: ['aprovado', 'convite_enviado', 'pendente'] }
      });

      if (invitations.length > 0) {
        const invitation = invitations[0];
        const updateData = { status: 'concluido' };
        if (user) {
             updateData.invited_user_id = user.id;
        }
        await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, updateData);
      }
    }

    return Response.json({
      success: true,
      message: 'Termo aceito e motorista ativado com sucesso',
      acceptedAt: now,
      driver: updatedDriver
    });

  } catch (error) {
    console.error('Erro ao aceitar termos:', error);
    return Response.json(
      { error: error.message || 'Erro ao processar aceite dos termos' },
      { status: 500 }
    );
  }
});