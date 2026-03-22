import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const startTime = Date.now();
    // Reduzido drasticamente para 8s para evitar timeouts de gateway (504) em conexões lentas
    const TIMEOUT_LIMIT_MS = 8000; 

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'Event ID is required' }, { status: 400 });
    }

    console.log(`[DeleteEventFull] Processing deletion for event: ${eventId} by ${user.email}`);

    // Check existence and permissions
    const event = await base44.entities.Event.get(eventId).catch(() => null);
    if (!event) {
        return Response.json({ 
            success: true, 
            message: 'Evento não encontrado (já excluído)',
            completed: true
        });
    }

    const hasPermission = 
        user.role === 'admin' || 
        event.supplier_id === user.supplier_id ||
        event.manager_user_id === user.id ||
        user.event_access_active === true;

    if (!hasPermission) {
        return Response.json({ error: 'Permissão negada' }, { status: 403 });
    }

    let deletedCountThisRun = 0;
    let timeExceeded = false;

    // Helper for batch deletion
    const deleteBatchWithTimeout = async (entityName, filter) => {
        if (Date.now() - startTime > TIMEOUT_LIMIT_MS) return { count: 0, stopped: true };

        // Verify entity existence in SDK
        if (!base44.entities[entityName]) {
            console.warn(`[DeleteEventFull] Entity ${entityName} not found in SDK. Skipping.`);
            return { count: 0, stopped: false };
        }

        try {
            const BATCH_SIZE = 25; // Reduzido para garantir ciclos rápidos
            const items = await base44.entities[entityName].filter(filter, '-created_date', BATCH_SIZE);
            
            if (!items || items.length === 0) {
                return { count: 0, stopped: false };
            }

            await Promise.all(items.map(item => base44.entities[entityName].delete(item.id).catch(e => console.error(`Error deleting ${entityName} ${item.id}:`, e))));
            
            await new Promise(r => setTimeout(r, 50)); // Tiny yield

            // If we fetched a full batch, assume there might be more
            return { count: items.length, stopped: items.length === BATCH_SIZE };
        } catch (err) {
            console.error(`[DeleteEventFull] Error filtering ${entityName}:`, err);
            return { count: 0, stopped: false }; // Treat as done to avoid infinite loop on error
        }
    };

    // Entities to clean up in order
    // Added safety check for entity existence implicitly in helper
    const entitiesToDelete = ['EventTrip', 'EventPassenger', 'EventService', 'EventModuleAccess'];
    
    for (const entityName of entitiesToDelete) {
        // Keep deleting this entity until empty or time runs out
        while (Date.now() - startTime < TIMEOUT_LIMIT_MS) {
            const result = await deleteBatchWithTimeout(entityName, { event_id: eventId });
            deletedCountThisRun += result.count;
            
            if (result.stopped) {
                // We stopped because we hit a full batch (might have more) OR time limit inside helper
                // Continue loop to check time and try again if possible
                continue;
            } else {
                // stopped=false means we fetched < BATCH_SIZE (0 or partial), so we are done with this entity
                break;
            }
        }

        if (Date.now() - startTime >= TIMEOUT_LIMIT_MS) {
            timeExceeded = true;
            break;
        }
    }

    // If time exceeded, return partial success
    if (timeExceeded) {
        return Response.json({
            success: true,
            completed: false,
            deletedCount: deletedCountThisRun,
            message: `Processando exclusão... (${deletedCountThisRun} itens removidos)`
        });
    }

    // Final step: Delete the Event itself
    console.log(`[DeleteEventFull] Deleting main event entity: ${eventId}`);
    try {
        await base44.entities.Event.delete(eventId);
    } catch (e) {
        console.error("Error deleting event entity:", e);
        // Check if it's really gone
        const check = await base44.entities.Event.get(eventId).catch(() => null);
        if (check) {
             return Response.json({ 
                success: false, 
                completed: false,
                error: "Falha crítica: O evento não pôde ser excluído do banco de dados. Tente novamente." 
            });
        }
    }

    return Response.json({ 
        success: true, 
        completed: true,
        message: 'Evento excluído com sucesso.',
        deletedCount: deletedCountThisRun
    });

  } catch (error) {
    console.error('Erro ao excluir evento (ciclo):', error);
    return Response.json({ error: `Internal Error: ${error.message}` }, { status: 500 });
  }
});