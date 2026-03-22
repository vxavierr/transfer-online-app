import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    // Buscar motorista pelo token (usando service role)
    const drivers = await base44.asServiceRole.entities.Driver.filter({
      terms_token: token
    });

    if (drivers.length === 0) {
      return Response.json({ error: 'Token inválido' }, { status: 404 });
    }

    return Response.json({
      driver: drivers[0]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});