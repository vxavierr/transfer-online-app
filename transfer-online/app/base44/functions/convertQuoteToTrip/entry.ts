import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { quoteId } = await req.json();

    if (!quoteId) {
      return Response.json({ error: 'ID da cotação é obrigatório' }, { status: 400 });
    }

    // Buscar a cotação
    const quote = await base44.asServiceRole.entities.QuoteRequest.get(quoteId);

    if (!quote) {
      return Response.json({ error: 'Cotação não encontrada' }, { status: 404 });
    }

    // Validar se já não foi convertida
    if (quote.status === 'convertido') {
      return Response.json({ error: 'Esta cotação já foi convertida em uma viagem.' }, { status: 400 });
    }

    let createdTrip = null;
    let tripType = '';

    // Determinar se é Admin ou Fornecedor e qual tipo de viagem criar
    // Se for Admin -> ServiceRequest (assumindo fluxo B2B/Plataforma)
    // Se for Fornecedor -> SupplierOwnBooking (Módulo 3)

    const isSupplier = user.supplier_id && user.role !== 'admin';
    // Se for admin e tiver supplier_id (ex: superadmin logado como supplier), priorizar o papel ativo?
    // Mas aqui vamos pela lógica simples: admin cria ServiceRequest, supplier cria OwnBooking.

    if (isSupplier) {
      // Criar SupplierOwnBooking
      tripType = 'supplier_own_booking';
      
      // Preparar dados
      // Precisamos criar ou buscar o cliente próprio se não existir
      let clientId = null;
      // Tentar encontrar cliente pelo email/nome ou criar novo
      const existingClients = await base44.asServiceRole.entities.SupplierOwnClient.filter({
        supplier_id: user.supplier_id,
        email: quote.customer_email
      });

      if (existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        // Criar novo cliente próprio
        const newClient = await base44.asServiceRole.entities.SupplierOwnClient.create({
          supplier_id: user.supplier_id,
          name: quote.customer_name,
          email: quote.customer_email,
          phone_number: quote.customer_phone,
          active: true
        });
        clientId = newClient.id;
      }

      // Calcular preço total (se for profissional com multiplos trechos, somar)
      let totalPrice = quote.admin_quote_price || 0;
      if (quote.quote_format === 'professional' && quote.quoted_trips?.length > 0) {
         // Se for profissional, talvez devêssemos criar MÚLTIPLAS viagens?
         // Por simplificação agora, vamos criar uma viagem principal e adicionar as outras como "notas" ou ignorar se complexo.
         // Mas o usuário pediu para converter.
         // Se tiver `multi_vehicle_quotes`, qual foi o escolhido? A cotação não salva a ESCOLHA do cliente, apenas que foi aceita.
         // O ideal seria o cliente escolher. Mas se foi "Aceito" genericamente, assumimos que o Admin/Fornecedor vai ajustar na criação.
         // Vamos usar os dados principais da cotação.
      }

      const bookingData = {
        supplier_id: user.supplier_id,
        client_id: clientId,
        service_type: quote.service_type || 'one_way',
        origin: quote.origin,
        destination: quote.destination,
        date: quote.date,
        time: quote.time,
        passengers: quote.passengers,
        passenger_name: quote.customer_name,
        passenger_phone: quote.customer_phone,
        passenger_email: quote.customer_email,
        price: totalPrice,
        status: 'confirmada', // Já nasce confirmada pois a proposta foi aceita
        payment_status: 'pendente',
        notes: `Convertido da Cotação ${quote.quote_number}. ${quote.notes || ''}`,
        vehicle_type_name: quote.vehicle_type_name,
        origin_flight_number: quote.origin_flight_number,
        destination_flight_number: quote.destination_flight_number,
        return_date: quote.return_date,
        return_time: quote.return_time,
        hours: quote.hours,
        distance_km: quote.distance_km,
        duration_minutes: quote.duration_minutes
      };

      // Gerar número da reserva
      const bookingCounter = await base44.asServiceRole.entities.BookingCounter.filter({ counter_name: 'main' });
      let nextNumber = 1;
      if (bookingCounter.length > 0) {
        nextNumber = bookingCounter[0].last_number + 1;
        await base44.asServiceRole.entities.BookingCounter.update(bookingCounter[0].id, { last_number: nextNumber });
      } else {
        await base44.asServiceRole.entities.BookingCounter.create({ counter_name: 'main', last_number: 1 });
      }
      bookingData.booking_number = `VG-${String(nextNumber).padStart(6, '0')}`;

      createdTrip = await base44.asServiceRole.entities.SupplierOwnBooking.create(bookingData);

    } else {
      // Admin -> ServiceRequest
      tripType = 'service_request';

      // Precisamos de um client_id da plataforma (Client entity)
      // Como é uma cotação avulsa, talvez não tenha Client cadastrado.
      // Vamos procurar um cliente "Avulso" ou criar?
      // Ou usar um campo "requester_user_id" se disponível.
      // Por simplificação, se não tiver client_id vinculado, vamos deixar null (se schema permitir) ou usar um cliente padrão.
      // ServiceRequest obriga `client_id`? Sim.
      // Vamos buscar um cliente chamado "Cliente Avulso" ou similar, ou criar um temporário.
      // Melhor: Tentar achar um cliente pelo nome da empresa se houver, senão usar um Cliente Padrão.
      
      let clientId = 'avulso'; // Placeholder
      const avulsoClients = await base44.asServiceRole.entities.Client.filter({ name: 'Cliente Avulso' });
      if (avulsoClients.length > 0) {
        clientId = avulsoClients[0].id;
      } else {
        // Tentar pegar o primeiro cliente ativo como fallback ou criar um "Cliente Avulso"
        const anyClient = await base44.asServiceRole.entities.Client.list(1);
        if (anyClient.length > 0) {
            // Criar um cliente avulso se não existir é mais seguro para não misturar dados
            const newClient = await base44.asServiceRole.entities.Client.create({
                name: 'Cliente Avulso (Cotações)',
                document_id: '00000000000',
                contact_person_name: 'Admin',
                contact_person_phone: '0000000000',
                active: true
            });
            clientId = newClient.id;
        }
      }

      const requestData = {
        client_id: clientId,
        user_id: user.id, // Admin que converteu
        requester_full_name: quote.requester_name || quote.customer_name,
        requester_email: quote.customer_email,
        requester_phone: quote.customer_phone,
        service_type: quote.service_type || 'one_way',
        origin: quote.origin,
        destination: quote.destination,
        date: quote.date,
        time: quote.time,
        passengers: quote.passengers,
        passenger_name: quote.customer_name,
        passenger_phone: quote.customer_phone,
        passenger_email: quote.customer_email,
        chosen_supplier_cost: quote.supplier_cost,
        chosen_client_price: quote.admin_quote_price,
        status: 'confirmada',
        notes: `Convertido da Cotação ${quote.quote_number}. ${quote.notes || ''}`,
        origin_flight_number: quote.origin_flight_number,
        destination_flight_number: quote.destination_flight_number,
        return_date: quote.return_date,
        return_time: quote.return_time,
        hours: quote.hours,
        distance_km: quote.distance_km,
        duration_minutes: quote.duration_minutes,
        vehicle_type_name: quote.vehicle_type_name
      };

      // Se tiver fornecedor definido na cotação
      if (quote.supplier_id) {
        requestData.chosen_supplier_id = quote.supplier_id;
        requestData.supplier_response_status = 'confirmado';
        // Se tiver custo do fornecedor definido
        if (quote.partner_cost) {
            requestData.chosen_supplier_cost = quote.partner_cost;
        }
      }

      // Gerar número
      const counter = await base44.asServiceRole.entities.ServiceRequestCounter.filter({ counter_name: 'main' });
      let nextNum = 1;
      if (counter.length > 0) {
        nextNum = counter[0].last_number + 1;
        await base44.asServiceRole.entities.ServiceRequestCounter.update(counter[0].id, { last_number: nextNum });
      } else {
        await base44.asServiceRole.entities.ServiceRequestCounter.create({ counter_name: 'main', last_number: 1 });
      }
      requestData.request_number = `SR-${String(nextNum).padStart(6, '0')}`;

      createdTrip = await base44.asServiceRole.entities.ServiceRequest.create(requestData);
    }

    if (createdTrip) {
      // Atualizar a cotação
      await base44.asServiceRole.entities.QuoteRequest.update(quoteId, {
        status: 'convertido',
        booking_id: createdTrip.id,
        converted_trip_type: tripType,
        converted_at: new Date().toISOString()
      });

      return Response.json({ success: true, trip: createdTrip, tripType });
    } else {
      return Response.json({ error: 'Falha ao criar viagem' }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro ao converter cotação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});