import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se o usuário está autenticado
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os usuários usando service role
    const users = await base44.asServiceRole.entities.User.filter({});
    
    return Response.json({ users });
  } catch (error) {
    console.error('[listAllUsers] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});