import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.supplier_id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { tripId, tripType, approved, margin } = await req.json();

        if (!tripId || !tripType) {
            return Response.json({ success: false, error: 'Missing trip info' }, { status: 400 });
        }

        let trip;
        if (tripType === 'own') {
            trip = await base44.entities.SupplierOwnBooking.get(tripId);
        } else {
            trip = await base44.entities.ServiceRequest.get(tripId);
        }

        if (!trip) {
            return Response.json({ success: false, error: 'Trip not found' }, { status: 404 });
        }

        // Verificar propriedade
        const ownerId = trip.supplier_id || trip.chosen_supplier_id;
        if (ownerId !== user.supplier_id) {
            return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        if (!approved) {
            // Rejeitar/Cancelar subcontratação
            const updateData = {
                subcontractor_id: null,
                subcontractor_cost: null,
                subcontractor_response_token: null,
                // Limpar outros campos se necessário
            };
             if (tripType === 'own') {
                await base44.entities.SupplierOwnBooking.update(tripId, updateData);
            } else {
                await base44.entities.ServiceRequest.update(tripId, updateData);
            }
            return Response.json({ success: true, message: 'Subcontratação cancelada' });
        }

        // Aprovar
        if (!trip.subcontractor_cost) {
            return Response.json({ success: false, error: 'Parceiro ainda não informou o custo' }, { status: 400 });
        }

        const marginValue = parseFloat(margin) || 0;
        const finalPrice = (trip.subcontractor_cost || 0) + marginValue;

        const updateData = {
            supplier_margin_on_subcontractor: marginValue,
            // Se for viagem própria, o preço final do cliente pode ser atualizado se o fornecedor quiser
            // Se for da plataforma, o preço já está fixo ou é sob consulta? 
            // Vamos assumir que "esse valor fica como custo total da viagem" significa custo para o fornecedor pagar.
            // O valor da venda para o cliente final (price) pode ser ajustado ou não.
            // Se for ServiceRequest, 'chosen_supplier_cost' é o valor que o fornecedor RECEBE da plataforma.
            // Se ele subcontrata, ele PAGA 'subcontractor_cost'. A diferença é o lucro dele.
            // Não precisamos alterar o preço de venda aqui, apenas registrar o custo interno.
        };

        // Se o parceiro JÁ informou motorista (fluxo otimizado), podemos já atribuir à viagem principal
        if (trip.subcontractor_driver_name) {
            updateData.driver_name = trip.subcontractor_driver_name;
            updateData.driver_phone = trip.subcontractor_driver_phone;
            updateData.vehicle_model = trip.subcontractor_vehicle_model;
            updateData.vehicle_plate = trip.subcontractor_vehicle_plate;
            updateData.driver_id = null; // Indica motorista externo/manual
            
            // Se for own booking e estava pendente, confirmar
            if (tripType === 'own' && trip.status === 'pendente') {
                updateData.status = 'confirmada';
            }
        }

        if (tripType === 'own') {
            // Se for própria, talvez atualizar o preço de venda se for um modelo cost-plus?
            // O prompt diz "fornecedor concorda com o valor e insere sua marge de lucro e esse valor fica como custo total da viagem".
            // Talvez "custo total" = preço final para o cliente.
            updateData.price = finalPrice; 
            await base44.entities.SupplierOwnBooking.update(tripId, updateData);
        } else {
            // Se for da plataforma, o preço de venda já foi acordado com o cliente.
            // A margem é apenas interna.
            await base44.entities.ServiceRequest.update(tripId, updateData);
        }

        return Response.json({ success: true, message: 'Subcontratação confirmada' });

    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});