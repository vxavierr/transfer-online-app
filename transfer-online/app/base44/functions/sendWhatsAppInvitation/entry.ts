import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { phone, message } = body;

    if (!phone || !message) {
      return Response.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    // Sanitização básica do telefone
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Se não tiver código do país (assumindo BR se tiver 10 ou 11 dígitos)
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone;
    }

    const instanceId = Deno.env.get("EVOLUTION_INSTANCE_NAME");
    const token = Deno.env.get("EVOLUTION_API_KEY");
    const apiUrl = Deno.env.get("EVOLUTION_API_URL");
    const clientToken = Deno.env.get("EVOLUTION_CLIENT_TOKEN");

    if (!instanceId || !token || !apiUrl) {
        console.error("Z-API credentials missing");
        return Response.json({ error: 'WhatsApp configuration missing' }, { status: 500 });
    }

    // Robust URL construction
    let baseUrl = apiUrl.trim();
    while(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    try {
        const urlObj = new URL(baseUrl);
        baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
        console.warn("Invalid API URL format", e);
    }

    const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
    
    const headers = { 'Content-Type': 'application/json' };
    if (clientToken) headers['Client-Token'] = clientToken;

    const response = await fetch(zApiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            phone: cleanPhone,
            message: message
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Z-API Error:", errorData);
        return Response.json({ error: `WhatsApp provider error: ${response.status} - ${errorData}` }, { status: 502 });
    }

    const data = await response.json();
    return Response.json({ success: true, provider_response: data });

  } catch (error) {
    console.error('Function Error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});