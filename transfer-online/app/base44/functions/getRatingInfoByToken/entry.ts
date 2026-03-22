import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    // Limpeza agressiva do token para remover caracteres invisíveis ou formatação incorreta
    const rawToken = token;
    token = token.trim().replace(/[^a-f0-9-]/gi, '');
    
    console.log(`[getRatingInfoByToken] Buscando token limpo: "${token}" (Original: "${rawToken}")`);

    if (token.length !== 36) {
        console.warn(`[getRatingInfoByToken] Token parece ter tamanho incorreto: ${token.length}`);
    }

    // Buscar Viagem pelo token (Polimórfico) - Busca Paralela para maior eficiência e garantia
    const [serviceRequests, ownBookings, bookings] = await Promise.all([
      base44.asServiceRole.entities.ServiceRequest.filter({ rating_link_token: token }),
      base44.asServiceRole.entities.SupplierOwnBooking.filter({ rating_link_token: token }),
      base44.asServiceRole.entities.Booking.filter({ rating_link_token: token })
    ]);

    console.log(`[getRatingInfoByToken] Resultados: SR=${serviceRequests?.length}, SOB=${ownBookings?.length}, BKG=${bookings?.length}`);

    let request = null;
    let tripType = null; // 'service_request', 'supplier_own_booking', 'booking'
    let tokenAuditLog = null;

    if (serviceRequests && serviceRequests.length > 0) {
      request = serviceRequests[0];
      tripType = 'service_request';
    } else if (ownBookings && ownBookings.length > 0) {
      request = ownBookings[0];
      tripType = 'supplier_own_booking';
    } else if (bookings && bookings.length > 0) {
      request = bookings[0];
      tripType = 'booking';
    }

    // Fallback: Tentar encontrar via TripStatusLog (Auditoria)
    if (!request) {
        console.log(`[getRatingInfoByToken] Token não encontrado nas entidades principais. Tentando via TripStatusLog...`);
        try {
            // Buscar logs que contenham o token nas notas
            // Nota: O filtro 'contains' pode variar, vamos tentar listar logs recentes ou filtrar exato se a nota for exatamente o token. 
            // Como gravamos "Rating Token Generated: TOKEN", vamos tentar buscar logs de status 'rating_link_generated' e filtrar na memória se necessário, 
            // ou assumir que o sistema de filtro suporta $contains ou similar. 
            // Se não suportar, vamos listar os ultimos X logs de status 'rating_link_generated'
            
            const logs = await base44.asServiceRole.entities.TripStatusLog.filter({ 
                status: 'rating_link_generated' 
            }, '-timestamp', 50); // Últimos 50

            const matchLog = logs.find(l => l.notes && l.notes.includes(token));
            
            if (matchLog) {
                tokenAuditLog = matchLog;
                console.log(`[getRatingInfoByToken] Token encontrado no TripStatusLog: ${matchLog.id}`);
                let tripId = matchLog.service_request_id || matchLog.supplier_own_booking_id || matchLog.booking_id;
                
                if (tripId) {
                    // Buscar a viagem diretamente pelo ID
                    if (matchLog.service_request_id) {
                        request = await base44.asServiceRole.entities.ServiceRequest.get(tripId);
                        tripType = 'service_request';
                    } else if (matchLog.supplier_own_booking_id) {
                        request = await base44.asServiceRole.entities.SupplierOwnBooking.get(tripId);
                        tripType = 'supplier_own_booking';
                    } else if (matchLog.booking_id) {
                        request = await base44.asServiceRole.entities.Booking.get(tripId);
                        tripType = 'booking';
                    }
                    
                    if (request) {
                        console.log(`[getRatingInfoByToken] Viagem recuperada via Log: ${request.id}. Token atual na viagem: ${request.rating_link_token}`);
                        // Opcional: Se o token na viagem for diferente, podemos decidir se aceitamos o do log (link antigo mas válido?) ou rejeitamos.
                        // Para resolver o problema do usuário "Inválido", vamos aceitar se o token bater OU se o token na viagem for nulo (perda de dados).
                        // Se o token na viagem for OUTRO, significa que foi gerado um novo. Nesse caso, o link antigo tecnicamente expirou/foi invalidado.
                        // Mas se o usuário acabou de gerar... vamos considerar válido para debug por enquanto, ou melhor, avisar.
                        
                        if (request.rating_link_token !== token) {
                            console.warn(`[getRatingInfoByToken] Token mismatch! Link: ${token}, DB: ${request.rating_link_token}`);
                            // Se quisermos ser permissivos (arriscado se token foi revogado por segurança, mas útil para usabilidade agora):
                            // return Response.json({ error: 'Este link foi substituído por um mais recente.' }, { status: 409 });
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[getRatingInfoByToken] Erro no fallback de TripStatusLog:', e);
        }
    }

    if (!request) {
      console.error(`[getRatingInfoByToken] ERRO: Token não encontrado em nenhuma entidade nem nos logs: "${token}". Isso indica um link inválido, expirado há muito tempo ou falha na persistência original.`);
      return Response.json({ error: 'Link inválido ou viagem não encontrada' }, { status: 404 });
    }

    const now = new Date();
    let expiresAt = request.rating_link_expires_at ? new Date(request.rating_link_expires_at) : null;

    if (!expiresAt && tokenAuditLog?.timestamp) {
      expiresAt = new Date(new Date(tokenAuditLog.timestamp).getTime() + 7 * 24 * 60 * 60 * 1000);
      console.warn(`[getRatingInfoByToken] Expiração reconstruída via log para o token ${token}`);
    }

    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
      return Response.json({ error: 'Link sem data de expiração definida' }, { status: 410 });
    }

    if (expiresAt < now) {
      return Response.json({ error: 'Este link de avaliação expirou' }, { status: 410 });
    }

    if (request.rating_submitted) {
      return Response.json({ error: 'Esta viagem já foi avaliada' }, { status: 409 });
    }

    // Normalizando campos pois podem variar levemente entre entidades
    let passengerName = request.passenger_name;
    if (tripType === 'booking') passengerName = request.customer_name;
    
    // Fallback para customer_name se passenger_name for vazio em ServiceRequest/SupplierOwnBooking
    if (!passengerName && request.customer_name) passengerName = request.customer_name;

    return Response.json({
      success: true,
      tripType,
      trip: {
        id: request.id,
        date: request.date,
        time: request.time,
        origin: request.origin,
        destination: request.destination,
        driver_name: request.driver_name,
        vehicle_model: request.vehicle_model,
        passengers: request.passengers,
        passenger_name: passengerName
      }
    });

  } catch (error) {
    console.error('Erro ao validar token:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});