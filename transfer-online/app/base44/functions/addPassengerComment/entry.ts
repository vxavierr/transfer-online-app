import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const requestBody = await req.json();
        const { passengerId, tripId, comment, token } = requestBody;

        if (!passengerId || !comment) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Auth check
        let authorizedUser = null;
        if (token) {
            const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token }, {}, 1);
            if (sharedLists.length === 0) {
                return Response.json({ error: 'Invalid or expired token' }, { status: 403 });
            }
        } else {
            const user = await base44.auth.me();
            if (!user) {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
            authorizedUser = user;
        }

        // Get passenger
        const passenger = await base44.asServiceRole.entities.EventPassenger.get(passengerId);
        if (!passenger) {
            return Response.json({ error: 'Passenger not found' }, { status: 404 });
        }

        // Add comment to passenger notes or create a comments array
        const currentComments = passenger.comments || [];
        const newComment = {
            text: comment,
            added_at: new Date().toISOString(),
            added_by: authorizedUser?.full_name || 'Coordenador'
        };
        
        currentComments.push(newComment);

        // Update passenger
        await base44.asServiceRole.entities.EventPassenger.update(passengerId, {
            comments: currentComments
        });

        return Response.json({
            success: true,
            message: 'Comentário adicionado com sucesso'
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
});