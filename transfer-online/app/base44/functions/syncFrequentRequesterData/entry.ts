import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.email) {
            return Response.json({ success: false, message: 'User not authenticated' }, { status: 401 });
        }

        // 1. Buscar FrequentRequester com o mesmo email
        // Usamos asServiceRole para garantir acesso global, independente de quem cadastrou
        const frequentRequesters = await base44.asServiceRole.entities.FrequentRequester.filter({
            email: user.email
        });

        if (!frequentRequesters || frequentRequesters.length === 0) {
            return Response.json({ success: true, updated_count: 0, message: 'No frequent requester found for this email' });
        }

        let totalUpdated = 0;

        // 2. Para cada FrequentRequester encontrado, buscar e atualizar ServiceRequests
        for (const freqReq of frequentRequesters) {
            // Buscamos requests vinculadas a este frequent_requester
            const requestsToUpdate = await base44.asServiceRole.entities.ServiceRequest.filter({
                frequent_requester_id: freqReq.id
            });

            // Filtramos apenas as que ainda NÃO têm um usuário de sistema vinculado
            const pendingRequests = requestsToUpdate.filter(r => !r.requester_user_id);

            for (const request of pendingRequests) {
                await base44.asServiceRole.entities.ServiceRequest.update(request.id, {
                    requester_user_id: user.id
                });
                totalUpdated++;
            }

            // Marcar o FrequentRequester como vinculado a um usuário
            if (!freqReq.linked_to_user) {
                await base44.asServiceRole.entities.FrequentRequester.update(freqReq.id, {
                    linked_to_user: true
                });
            }
        }

        return Response.json({
            success: true,
            updated_count: totalUpdated,
            message: `Successfully linked ${totalUpdated} requests to user ${user.email}`
        });

    } catch (error) {
        console.error('Sync error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});