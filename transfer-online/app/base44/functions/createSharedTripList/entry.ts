import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, coordinatorName, tripIds, filters, expiresInHours = 48 } = await req.json();

    if (!name) {
      return Response.json({ error: 'Nome da lista é obrigatório' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Gerar Número de Controle (Control Number)
    // Formato: L-{timestamp_parcial}-{random} para ser curto e único
    const timestampPart = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 dígitos aleatórios
    const controlNumber = `LNK-${timestampPart}${randomPart}`;

    // Construir payload evitando campos nulos onde o schema espera string
    const payload = {
      name,
      token,
      control_number: controlNumber,
      created_by_user_id: user.id,
      active: true,
      expires_at: expiresAt.toISOString(),
      trip_ids: tripIds || []
    };

    // Adicionar campos opcionais apenas se existirem
    if (user.supplier_id) {
      payload.supplier_id = user.supplier_id;
    }
    
    if (coordinatorName && coordinatorName.trim() !== '') {
      payload.coordinator_name = coordinatorName;
    }

    if (filters && Object.keys(filters).length > 0) {
      payload.filters = filters;
    }

    const sharedList = await base44.entities.SharedTripList.create(payload);

    // Construir URL pública (usando window.location.origin no frontend, aqui retornamos apenas o token/path)
    const publicPath = `/PublicSharedTripListView?token=${token}`;

    return Response.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      publicPath,
      sharedList
    });

  } catch (error) {
    console.error('[createSharedTripList] Erro:', error);
    // Melhorar detalhamento do erro
    let errorMessage = error.message || 'Erro ao criar lista compartilhada';
    if (error.response && error.response.data) {
        errorMessage += ` - ${JSON.stringify(error.response.data)}`;
    }
    return Response.json({ 
      success: false, 
      error: errorMessage
    }, { status: 500 });
  }
});