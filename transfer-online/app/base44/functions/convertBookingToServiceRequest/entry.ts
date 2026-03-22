import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Obter dados do corpo da requisição
        const { bookingId } = await req.json();

        if (!bookingId) {
            return Response.json({ error: 'bookingId is required' }, { status: 400 });
        }

        // 1. Buscar o Booking
        const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
        
        if (!booking) {
            return Response.json({ error: 'Booking not found' }, { status: 404 });
        }

        // 2. Verificar se já existe ServiceRequest para este booking
        const existingRequests = await base44.asServiceRole.entities.ServiceRequest.filter({ 
            converted_booking_id: bookingId 
        });

        if (existingRequests.length > 0) {
            console.log(`[convertBookingToServiceRequest] Já existe SR para booking ${bookingId}: ${existingRequests[0].request_number}`);
            return Response.json({ 
                success: true, 
                message: 'ServiceRequest already exists for this booking',
                serviceRequestId: existingRequests[0].id,
                requestNumber: existingRequests[0].request_number
            });
        }

        console.log(`[convertBookingToServiceRequest] Criando nova SR para booking ${bookingId} (${booking.booking_number})`);

        // 3. Buscar Cliente padrão para "Guests"
        // Tenta encontrar um cliente que represente vendas do site/avulsas
        let clientId = null;
        const clients = await base44.asServiceRole.entities.Client.list();
        
        // Tenta achar por nome ou usa o primeiro disponível
        const defaultClient = clients.find(c => 
            c.name.toLowerCase().includes('site') || 
            c.name.toLowerCase().includes('avulso') || 
            c.name.toLowerCase().includes('particular') ||
            c.name.toLowerCase().includes('transferonline')
        );
        
        if (defaultClient) {
            clientId = defaultClient.id;
        } else {
            // FIX: Não usar o primeiro cliente da lista (risco de vincular a empresa errada)
            console.warn(`[convertBookingToServiceRequest] Nenhum cliente 'Particular/Site' encontrado. SR ficará sem client_id.`);
            clientId = null;
        }

        // 4. Gerar número da ServiceRequest
        const srNumberResponse = await base44.asServiceRole.functions.invoke('generateServiceRequestNumber');
        const srNumber = srNumberResponse.data.requestNumber;

        // 5. Preparar dados da ServiceRequest
        // Mapear campos do Booking para ServiceRequest
        const serviceRequestData = {
            request_number: srNumber,
            client_id: clientId,
            user_id: booking.created_by_id || booking.created_by || 'system', // Tenta usar ID se disponível
            
            // Dados do Solicitante e Passageiro (mesma pessoa no caso de Guest)
            requester_full_name: booking.customer_name,
            requester_email: booking.customer_email,
            requester_phone: booking.customer_phone,
            passenger_name: booking.customer_name,
            passenger_email: booking.customer_email,
            passenger_phone: booking.customer_phone,
            passengers: booking.passengers,
            
            // Detalhes da Viagem
            service_type: booking.service_type,
            origin: booking.origin,
            destination: booking.destination,
            date: booking.date,
            time: booking.time,
            
            // Voos
            origin_flight_number: booking.origin_flight_number,
            destination_flight_number: booking.destination_flight_number,
            
            // Retorno (se houver)
            return_date: booking.return_date,
            return_time: booking.return_time,
            is_return_leg: false, // SR principal é a ida (ou única)
            
            // Veículo e Notas
            vehicle_model: booking.vehicle_type_name, // Apenas informativo na SR
            chosen_vehicle_type_id: booking.vehicle_type_id,
            notes: booking.notes,
            selected_additional_items: booking.selected_additional_items || [],
            
            const isPaid = booking.payment_status === 'pago';

            // Status e Pagamento
            // Se já está pago, entra como confirmada direto. Se não, aguarda fluxo normal.
            status: isPaid ? 'confirmada' : 'aguardando_fornecedor', 
            payment_status: isPaid ? 'pago' : 'pendente',
            
            // Fornecedor e Valores
            chosen_supplier_id: booking.supplier_id,
            chosen_supplier_cost: booking.supplier_cost || (booking.total_price * 0.8), // Fallback de estimativa (margem 20%)
            chosen_client_price: booking.total_price,
            supplier_response_status: isPaid ? 'confirmado' : 'aguardando_resposta',
            
            // Vínculo com Booking original
            converted_booking_id: booking.id,
            
            // Métricas
            distance_km: booking.distance_km,
            duration_minutes: booking.duration_minutes,
            driver_language: booking.driver_language
        };

        // Criar a ServiceRequest
        const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.create(serviceRequestData);
        console.log(`[convertBookingToServiceRequest] SR criada com sucesso: ${serviceRequest.id} (${serviceRequest.request_number})`);

        return Response.json({ 
            success: true, 
            serviceRequestId: serviceRequest.id,
            requestNumber: serviceRequest.request_number
        });

    } catch (error) {
        console.error('[convertBookingToServiceRequest] Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});