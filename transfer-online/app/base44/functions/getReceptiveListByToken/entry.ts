import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ 
        success: false, 
        error: 'Token não fornecido' 
      }, { status: 400 });
    }

    // 1. Buscar lista compartilhada pelo token
    const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });

    if (sharedLists.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Link inválido ou não encontrado',
        errorType: 'not_found'
      }, { status: 404 });
    }

    const sharedList = sharedLists[0];

    // 2. Verificar se o link está ativo (Bloqueio Manual)
    if (sharedList.active === false) {
      return Response.json({ 
        success: false, 
        error: 'Este link foi bloqueado pelo fornecedor.',
        errorType: 'blocked',
        expiresAt: sharedList.expires_at
      }, { status: 403 });
    }

    // 3. Verificar se não expirou
    const now = new Date();
    const expiresAt = new Date(sharedList.expires_at);

    if (now > expiresAt) {
      // Format date for better error message (simple ISO for frontend to format)
      return Response.json({ 
        success: false, 
        error: `Este link expirou em ${sharedList.expires_at}`,
        errorType: 'expired',
        expiresAt: sharedList.expires_at,
        serverTime: now.toISOString(),
        parsedExpiry: expiresAt.toISOString()
      }, { status: 410 });
    }

    // 3. Buscar detalhes completos das solicitações (ServiceRequest ou SupplierOwnBooking)
    const requests = await Promise.all(
      sharedList.request_ids.map(async (id) => {
        // Tentar ServiceRequest
        const sr = await base44.asServiceRole.entities.ServiceRequest.filter({ id });
        if (sr.length > 0) {
          // Buscar nome do cliente da plataforma
          let clientName = null;
          if (sr[0].client_id) {
            const client = await base44.asServiceRole.entities.Client.get(sr[0].client_id);
            clientName = client?.name;
          }
          return { 
            ...sr[0], 
            _source_type: 'service_request',
            client_display_name: clientName
          };
        }

        // Tentar SupplierOwnBooking
        const sob = await base44.asServiceRole.entities.SupplierOwnBooking.filter({ id });
        if (sob.length > 0) {
          // Buscar nome do cliente próprio
          let clientName = null;
          if (sob[0].client_id) {
            try {
              const client = await base44.asServiceRole.entities.SupplierOwnClient.get(sob[0].client_id);
              clientName = client?.name;
            } catch (e) {
              console.log('Erro ao buscar SupplierOwnClient', e);
            }
          }

          // Normalizar para o frontend
          return {
            ...sob[0],
            chosen_supplier_id: sob[0].supplier_id,
            request_number: sob[0].booking_number,
            passenger_name: sob[0].passenger_name || (sob[0].passengers_details?.[0]?.name) || 'Passageiro',
            planned_stops: sob[0].additional_stops || [], // Normalizar stops para o frontend
            requester_full_name: sob[0].passenger_name, // Fallback para solicitante em cliente próprio
            client_display_name: clientName,
            _source_type: 'supplier_own_booking'
          };
        }
        
        return null;
      })
    );

    const flatRequests = requests.filter(r => r !== null);

    // 4. Buscar dados do fornecedor
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ 
      id: sharedList.supplier_id 
    });
    const supplier = suppliers[0] || null;

    // 5. Ordenar por data/hora
    flatRequests.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return dateTimeA - dateTimeB;
    });

    return Response.json({
      success: true,
      sharedList: {
        token: sharedList.token,
        expiresAt: sharedList.expires_at,
        coordinatorName: sharedList.coordinator_name,
        supplierName: supplier?.name || 'Fornecedor'
      },
      requests: flatRequests,
      requestCount: flatRequests.length
    });

  } catch (error) {
    console.error('[getReceptiveListByToken] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao buscar lista de receptivos' 
    }, { status: 500 });
  }
});