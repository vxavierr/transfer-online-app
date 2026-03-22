import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Forward the request to the new Resend-based function
        // Note: Invoke returns an Axios response object
        const response = await base44.functions.invoke('sendBoardingPassEmailResend', body);

        // Forward the response status and data
        return Response.json(response.data, { status: response.status });

    } catch (error) {
        console.error('Error delegating to sendBoardingPassEmailResend:', error);
        // Handle axios error structure if present
        const status = error.response?.status || 500;
        const message = error.response?.data?.error || error.message;
        return Response.json({ error: message }, { status });
    }
});