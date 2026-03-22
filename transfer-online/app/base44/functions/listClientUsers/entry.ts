import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetClientId = user.role === 'admin' ? (body.client_id || user.client_id) : user.client_id;

    if (!targetClientId) {
      return Response.json({ success: false, users: [] });
    }

    const users = await base44.asServiceRole.entities.User.filter({ client_id: targetClientId });
    const filteredUsers = users.filter((item) => !item.is_driver);

    return Response.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error('[listClientUsers] Error:', error);
    return Response.json({ success: false, error: error.message || 'Erro ao listar usuários' }, { status: 500 });
  }
});