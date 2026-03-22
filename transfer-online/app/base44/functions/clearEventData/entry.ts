import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Log inicial para debug
    console.log('Iniciando clearEventData...');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('Usuário não autenticado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        console.error('Erro ao ler body:', e);
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { eventId } = body;

    if (!eventId) {
      console.log('Event ID não fornecido');
      return Response.json({ error: 'Event ID is required' }, { status: 400 });
    }

    console.log(`Limpando evento: ${eventId}, Usuário: ${user.email}`);

    // Verificar permissão (Admin ou Manager do Evento ou Dono da Supplier)
    const event = await base44.entities.Event.get(eventId);
    if (!event) {
        console.log('Evento não encontrado');
        return Response.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const hasPermission = 
        user.role === 'admin' || 
        event.supplier_id === user.supplier_id ||
        event.manager_user_id === user.id ||
        user.event_access_active === true; // Adicionado para garantir permissão de gestores

    if (!hasPermission) {
        console.log('Permissão negada');
        return Response.json({ error: 'Permissão negada para limpar este evento' }, { status: 403 });
    }

    // Função auxiliar para deletar em lotes
    const deleteInBatches = async (entityName, filter) => {
        let deletedCount = 0;
        let hasMore = true;
        const BATCH_SIZE = 20; // Reduzido para evitar sobrecarga

        console.log(`Iniciando deleção de ${entityName}...`);

        while (hasMore) {
            // Buscar lote de IDs
            // Usando created_date para ordenação consistente
            const items = await base44.entities[entityName].filter(filter, '-created_date', BATCH_SIZE);
            
            if (!items || items.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`Deletando lote de ${items.length} itens de ${entityName}...`);

            // Deletar lote em paralelo com tratamento de erro individual
            const deletePromises = items.map(async (item) => {
                try {
                    await base44.entities[entityName].delete(item.id);
                    return true;
                } catch (err) {
                    console.error(`Erro ao deletar ${entityName} ${item.id}:`, err);
                    return false;
                }
            });

            const results = await Promise.all(deletePromises);
            const successfulDeletes = results.filter(r => r).length;
            deletedCount += successfulDeletes;
            
            // Pausa curta para não sobrecarregar
            await new Promise(r => setTimeout(r, 50));
        }
        console.log(`Finalizada deleção de ${entityName}. Total: ${deletedCount}`);
        return deletedCount;
    };

    // 1. Deletar Viagens do Evento (EventTrip)
    const tripsDeleted = await deleteInBatches('EventTrip', { event_id: eventId });

    // 2. Deletar Passageiros do Evento (EventPassenger)
    const passengersDeleted = await deleteInBatches('EventPassenger', { event_id: eventId });

    // 3. Resetar contadores do evento
    await base44.entities.Event.update(eventId, {
        passenger_count: 0,
        confirmed_count: 0,
        pending_count: 0,
        trip_count: 0
    });

    console.log('Dados limpos com sucesso');

    return Response.json({ 
        success: true, 
        message: 'Dados do evento limpos com sucesso',
        details: {
            tripsDeleted,
            passengersDeleted
        }
    });

  } catch (error) {
    console.error('Erro CRÍTICO ao limpar dados do evento:', error);
    // Retornar o erro detalhado para o frontend ajudar no debug
    return Response.json({ 
        error: error.message, 
        stack: error.stack 
    }, { status: 500 });
  }
});