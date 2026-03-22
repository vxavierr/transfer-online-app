import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação (admins e fornecedores autorizados podem gerar links)
    const user = await base44.auth.me();
    let isAuthorized = user && user.role === 'admin';

    if (!isAuthorized && user?.supplier_id) {
        try {
            const supplier = await base44.asServiceRole.entities.Supplier.get(user.supplier_id);
            if (supplier?.features?.can_create_manual_quotes) {
                isAuthorized = true;
            }
        } catch (e) {
            console.error('Error fetching supplier permissions:', e);
        }
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quoteId, forceNew } = await req.json();

    if (!quoteId) {
      return Response.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    // Buscar a cotação
    const quote = await base44.entities.QuoteRequest.get(quoteId);
    
    if (!quote) {
      return Response.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Se já tiver token e não for forçado novo, retornar ele
    if (quote.public_token && !forceNew) {
      return Response.json({ token: quote.public_token });
    }

    // Gerar novo token
    const token = crypto.randomUUID();

    // Atualizar cotação
    await base44.entities.QuoteRequest.update(quoteId, {
      public_token: token
    });

    return Response.json({ token });

  } catch (error) {
    console.error('Error generating public token:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});