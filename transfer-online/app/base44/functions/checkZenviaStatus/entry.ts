import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        const body = await req.json();
        const { messageId } = body;

        if (!messageId) {
            return Response.json({ error: 'messageId is required' }, { status: 400 });
        }

        const zenviaToken = Deno.env.get('ZENVIA_API_TOKEN');
        if (!zenviaToken) {
            return Response.json({ error: 'ZENVIA_API_TOKEN not set' }, { status: 500 });
        }

        console.log(`[Zenvia Status] Checking status for ID: ${messageId}`);

        const response = await fetch(`https://api.zenvia.com/v2/channels/sms/messages/${messageId}`, {
            method: 'GET',
            headers: {
                'X-API-TOKEN': zenviaToken,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        console.log(`[Zenvia Status] Result:`, JSON.stringify(data));

        return Response.json(data);

    } catch (error) {
        console.error('[Zenvia Status] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});