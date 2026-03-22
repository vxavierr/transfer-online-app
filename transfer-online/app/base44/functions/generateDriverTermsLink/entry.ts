import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação (Admin ou Supplier)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    // Permitir se for admin ou se for o dono do motorista (supplier)
    // No caso do GerenciarAprovacoes, é admin.
    const isAdmin = user.role === 'admin' || user.email === 'fernandotransferonline@gmail.com';
    
    const { driverId } = await req.json();

    if (!driverId) {
      return Response.json({ error: 'ID do motorista obrigatório' }, { status: 400 });
    }

    const driver = await base44.entities.Driver.get(driverId);
    if (!driver) {
      return Response.json({ error: 'Motorista não encontrado' }, { status: 404 });
    }

    // Se não for admin, verificar se o usuário é do mesmo supplier
    if (!isAdmin) {
       // Se o usuário tiver supplier_id, verificar se bate
       if (user.supplier_id && user.supplier_id !== driver.supplier_id) {
         return Response.json({ error: 'Acesso negado a este motorista' }, { status: 403 });
       }
    }

    // Gerar token se não existir
    let token = driver.terms_token;
    if (!token) {
      // Gerar token aleatório simples
      token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
      
      await base44.asServiceRole.entities.Driver.update(driverId, {
        terms_token: token
      });
    }

    // Construir URL
    const origin = req.headers.get('origin') || 'https://app.transferonline.com.br';
    const link = `${origin}/TermoAceiteMotorista?token=${token}`;

    return Response.json({
      success: true,
      link: link,
      token: token
    });

  } catch (error) {
    console.error('Erro ao gerar link de aceite:', error);
    return Response.json(
      { error: error.message || 'Erro ao gerar link' },
      { status: 500 }
    );
  }
});