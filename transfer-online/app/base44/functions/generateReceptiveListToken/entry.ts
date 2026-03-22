import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Gerar UUID usando crypto
function generateUUID() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  const hex = Array.from(arr).map(x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.supplier_id) {
      return Response.json({ 
        success: false, 
        error: 'Acesso restrito a fornecedores' 
      }, { status: 403 });
    }

    const { serviceRequestIds, coordinatorName, coordinatorContact, coordinatorPaymentAmount, shareType } = await req.json();

    if (!serviceRequestIds || !Array.isArray(serviceRequestIds) || serviceRequestIds.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Selecione pelo menos uma solicitação' 
      }, { status: 400 });
    }

    // 1. Buscar todas as solicitações selecionadas (ServiceRequest ou SupplierOwnBooking)
    const requests = await Promise.all(
      serviceRequestIds.map(async (id) => {
        // Tentar ServiceRequest
        const sr = await base44.entities.ServiceRequest.filter({ id });
        if (sr.length > 0) return { ...sr[0], _source_type: 'service_request' };
        
        // Tentar SupplierOwnBooking
        const sob = await base44.entities.SupplierOwnBooking.filter({ id });
        if (sob.length > 0) {
          // Normalizar campos para validação
          return { 
            ...sob[0], 
            chosen_supplier_id: sob[0].supplier_id, 
            _source_type: 'supplier_own_booking' 
          };
        }
        
        return null;
      })
    );

    const flatRequests = requests.filter(r => r !== null);

    if (flatRequests.length === 0) {
       return Response.json({ 
        success: false, 
        error: 'Nenhuma solicitação válida encontrada.' 
      }, { status: 404 });
    }

    // 2. Validar que todas pertencem ao fornecedor
    const invalidRequests = flatRequests.filter(r => r.chosen_supplier_id !== user.supplier_id);
    if (invalidRequests.length > 0) {
      return Response.json({ 
        success: false, 
        error: 'Uma ou mais solicitações não pertencem ao seu fornecedor' 
      }, { status: 403 });
    }

    // 3. Encontrar o transfer mais tardio para calcular expiração
    const latestRequest = flatRequests.reduce((latest, current) => {
      const currentDateTime = new Date(`${current.date}T${current.time}`);
      const latestDateTime = new Date(`${latest.date}T${latest.time}`);
      return currentDateTime > latestDateTime ? current : latest;
    }, flatRequests[0]);

    const latestDateTime = new Date(`${latestRequest.date}T${latestRequest.time}`);
    const expiresAt = new Date(latestDateTime.getTime() + (24 * 60 * 60 * 1000)); // +24 horas

    // 4. Gerar token único
    const token = generateUUID();

    // 5. Criar registro de lista compartilhada
    const sharedList = await base44.entities.SharedReceptiveList.create({
      token,
      supplier_id: user.supplier_id,
      generated_by_user_id: user.id,
      request_ids: serviceRequestIds,
      expires_at: expiresAt.toISOString(),
      share_type: shareType || 'both',
      shared_at: new Date().toISOString(),
      coordinator_name: coordinatorName || null,
      coordinator_contact: coordinatorContact || null,
      coordinator_payment_amount: coordinatorPaymentAmount || null
    });

    // Criar registro de pagamento se houver valor definido
    if (coordinatorPaymentAmount && parseFloat(coordinatorPaymentAmount) > 0 && coordinatorName) {
      try {
        await base44.entities.CoordinatorPayout.create({
          coordinator_name: coordinatorName,
          coordinator_contact: coordinatorContact || '',
          amount: parseFloat(coordinatorPaymentAmount),
          shared_receptive_list_id: sharedList.id,
          supplier_id: user.supplier_id,
          status: 'pendente',
          created_by_user_id: user.id,
          payment_date: null,
          notes: 'Pagamento gerado automaticamente via Lista de Receptivos'
        });
      } catch (payoutError) {
        console.error('[generateReceptiveListToken] Erro ao criar pagamento do coordenador:', payoutError);
        // Não falhar a requisição principal, apenas logar erro
      }
    }

    // 6. Gerar URL completo
    // Em Deno Deploy o BASE_URL pode não estar setado, usar origin da request ou default
    // Mas aqui vamos usar o segredo se existir, ou construir
    const origin = req.headers.get('origin') || 'https://base44.app'; 
    // Nota: O frontend usa window.location.origin, aqui vamos retornar apenas o token e relative path, 
    // ou montar se tivermos certeza. O código original usava Deno.env.get('BASE_URL').
    const baseUrl = Deno.env.get('BASE_URL') || origin;
    const shareUrl = `${baseUrl}/ReceptiveListStatus?token=${token}`;

    return Response.json({
      success: true,
      token,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
      requestCount: serviceRequestIds.length,
      sharedList
    });

  } catch (error) {
    console.error('[generateReceptiveListToken] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao gerar link de compartilhamento' 
    }, { status: 500 });
  }
});