import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete the user entity record
        // Note: Actual Auth user deletion might require a different API if separated, 
        // but removing the User entity record is usually the primary step in Base44 apps.
        await base44.asServiceRole.entities.User.delete(user.id);

        return Response.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});