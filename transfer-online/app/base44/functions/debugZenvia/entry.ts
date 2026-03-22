import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        const body = await req.json();
        const { phone, overrideFrom } = body;

        // Default test number if none provided
        const targetPhone = phone;

        if (!targetPhone) {
            return Response.json({ error: 'Telefone é obrigatório para o teste.' }, { status: 400 });
        }

        // Configuration
        const zenviaToken = Deno.env.get('ZENVIA_API_TOKEN');
        const envZenviaFrom = Deno.env.get('ZENVIA_FROM');
        
        // Determine 'from' field
        // Priority: 1. overrideFrom (from request), 2. envZenviaFrom, 3. undefined (let Zenvia decide/default)
        let finalFrom = undefined;
        if (overrideFrom) finalFrom = overrideFrom;
        else if (envZenviaFrom) finalFrom = envZenviaFrom;

        if (!zenviaToken) {
             return Response.json({ 
                 success: false,
                 step: 'config_check',
                 error: 'ZENVIA_API_TOKEN não está configurado nas variáveis de ambiente.' 
             }, { status: 400 });
        }
        
        // Format phone
        let toPhone = targetPhone.replace(/\D/g, '');
        if (toPhone.startsWith('0')) toPhone = toPhone.substring(1);
        if (toPhone.length >= 10 && toPhone.length <= 11) toPhone = `55${toPhone}`;

        const payload = {
            to: toPhone,
            contents: [{ type: 'text', text: body.text || 'Teste TransferOnline (Debug Zenvia)' }]
        };

        if (finalFrom) {
            payload.from = finalFrom;
        }

        const requestLog = {
            url: 'https://api.zenvia.com/v2/channels/sms/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-TOKEN': zenviaToken ? `${zenviaToken.substring(0, 5)}...${zenviaToken.substring(zenviaToken.length - 5)}` : 'MISSING'
            },
            body: payload
        };

        console.log(`Debug Zenvia: Sending to ${toPhone}. From: ${finalFrom || '(default)'}`);

        // Create initial log entry (Need base44 client first, let's init it if needed or use simplified fetch if just debug)
        // Since debugZenvia doesn't import createClientFromRequest at top, I need to check imports.
        // Reading file 2 shows it DOES NOT import createClientFromRequest. 
        // I should stick to basic fetch for now or add import.
        // The file is using Deno.serve directly.
        // Let's add the import and client creation to enable logging.
        
        // Wait, I can't easily add import at top with find_replace if I don't target the top.
        // Let's skip logging for debugZenvia to avoid breaking it with missing imports, 
        // or I can try to add the import.
        
        // Actually, let's keep debugZenvia simple as it returns the full log to the caller anyway.
        // The user can see the result in the response.
        
        const startTime = Date.now();
        const response = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-TOKEN': zenviaToken || ''
            },
            body: JSON.stringify(payload)
        });
        const endTime = Date.now();

        const responseText = await response.text();
        
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(responseText);
        } catch(e) {
            jsonResponse = { raw_text: responseText, parse_error: e.message };
        }

        // Extract relevant response headers
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        return Response.json({
            success: response.ok,
            environment: {
                ZENVIA_FROM_CONFIGURED: envZenviaFrom || 'NOT_SET',
                TOKEN_PARTIAL: zenviaToken ? 'PRESENT' : 'MISSING'
            },
            request: requestLog,
            response: {
                status: response.status,
                statusText: response.statusText,
                latency_ms: endTime - startTime,
                headers: responseHeaders,
                data: jsonResponse
            }
        });

    } catch (error) {
        return Response.json({ 
            success: false,
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});