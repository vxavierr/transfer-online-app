import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        const body = await req.json();
        const { phone } = body;

        if (!phone) {
            return Response.json({ error: 'Phone number is required' }, { status: 400 });
        }

        // Configuration
        const zenviaToken = Deno.env.get('ZENVIA_API_TOKEN');
        const zenviaFrom = Deno.env.get('ZENVIA_FROM');

        if (!zenviaToken) {
            return Response.json({ error: 'ZENVIA_API_TOKEN not set' }, { status: 500 });
        }

        // Format phone
        let toPhone = phone.replace(/\D/g, '');
        if (toPhone.startsWith('0')) toPhone = toPhone.substring(1);
        if (toPhone.length >= 10 && toPhone.length <= 11) toPhone = `55${toPhone}`;

        console.log(`TestZenvia: Sending to ${toPhone} from ${zenviaFrom || 'DEFAULT'}`);

        const payload = {
            to: toPhone,
            contents: [{ type: 'text', text: 'Teste de SMS do Sistema TransferOnline' }]
        };

        if (zenviaFrom) {
            payload.from = zenviaFrom;
        }

        const response = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-TOKEN': zenviaToken
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('Zenvia Response:', responseText);

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(responseText);
        } catch {
            jsonResponse = { raw: responseText };
        }

        return Response.json({
            status: response.status,
            statusText: response.statusText,
            payload_sent: payload,
            zenvia_response: jsonResponse
        });

    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});