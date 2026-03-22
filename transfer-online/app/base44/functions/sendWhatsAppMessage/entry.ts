import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const E164_MIN_LENGTH = 10;
const E164_MAX_LENGTH = 15;

function parseJsonSafely(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function stringifyProviderValue(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) return value.message.trim();
    if (typeof value.error === 'string' && value.error.trim()) return value.error.trim();
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

function extractProviderError(responseText, responseJson) {
  const candidates = [
    responseJson?.message,
    responseJson?.error,
    responseJson?.detail,
    responseJson?.details,
    responseJson?.response?.message,
    responseJson?.response?.error,
    responseJson?.error?.message,
    responseJson?.data?.message,
    responseJson?.data?.error,
    Array.isArray(responseJson?.errors) ? responseJson.errors.map(stringifyProviderValue).filter(Boolean).join(' | ') : null,
    responseText
  ];

  for (const candidate of candidates) {
    const parsed = stringifyProviderValue(candidate);
    if (parsed) return parsed;
  }

  return 'Falha no provedor WhatsApp';
}

function shouldRetryStatus(status) {
  return [500, 502, 503, 504].includes(status);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhoneNumber(rawPhone) {
  const original = String(rawPhone || '').trim();
  if (!original) {
    return { ok: false, error: 'Telefone vazio' };
  }

  const hasExplicitInternationalPrefix = original.startsWith('+') || original.startsWith('00');
  let digits = original.replace(/\D/g, '');

  if (original.startsWith('00')) {
    digits = digits.replace(/^00/, '');
  }

  if (!digits) {
    return { ok: false, error: 'Telefone inválido' };
  }

  if (!hasExplicitInternationalPrefix && !digits.startsWith('55')) {
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    }
  }

  if (digits.length < E164_MIN_LENGTH || digits.length > E164_MAX_LENGTH) {
    return {
      ok: false,
      error: `Telefone fora do padrão internacional E.164: +${digits}`
    };
  }

  return {
    ok: true,
    phone: digits,
    e164: `+${digits}`,
    explicitInternational: hasExplicitInternationalPrefix
  };
}

async function checkWhatsAppNumber(baseUrl, instanceId, token, clientToken, phone) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: token
  };

  if (clientToken) headers['Client-Token'] = clientToken;

  const response = await fetch(`${baseUrl}/chat/whatsappNumbers/${instanceId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ numbers: [phone] })
  });

  const responseText = await response.text();
  const responseJson = parseJsonSafely(responseText);

  if (!response.ok) {
    return {
      checked: false,
      httpStatus: response.status,
      error: extractProviderError(responseText, responseJson),
      payload: responseJson || responseText
    };
  }

  const candidates = Array.isArray(responseJson)
    ? responseJson
    : Array.isArray(responseJson?.data)
      ? responseJson.data
      : Array.isArray(responseJson?.numbers)
        ? responseJson.numbers
        : Array.isArray(responseJson?.result)
          ? responseJson.result
          : [];

  const candidate = candidates[0] || null;
  const exists = candidate
    ? Boolean(
        candidate.exists ??
        candidate.valid ??
        candidate.isWhatsapp ??
        candidate.numberExists ??
        candidate.jid
      )
    : null;

  return {
    checked: true,
    exists,
    payload: responseJson,
    candidate
  };
}

Deno.serve(async (req) => {
  try {
    createClientFromRequest(req);
    const body = await req.json();
    const { to, message } = body;

    console.log(`[sendWhatsAppMessage] Request recebido para: ${to}`);

    if (!to || !message) {
      console.error('[sendWhatsAppMessage] Campos obrigatórios faltando');
      return Response.json({ success: false, error: 'Telefone e mensagem são obrigatórios' }, { status: 400 });
    }

    const apiUrl = Deno.env.get('EVOLUTION_API_URL');
    const token = Deno.env.get('EVOLUTION_API_KEY');
    const instanceId = Deno.env.get('EVOLUTION_INSTANCE_NAME');
    const clientToken = Deno.env.get('EVOLUTION_CLIENT_TOKEN');

    if (!apiUrl || !token || !instanceId) {
      console.error('[sendWhatsAppMessage] Configurações de ambiente faltando');
      return Response.json({ success: false, error: 'Configurações de WhatsApp não encontradas' }, { status: 500 });
    }

    let baseUrl = apiUrl.trim();
    while (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    try {
      const urlObj = new URL(baseUrl);
      baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      // ignore
    }

    const normalizedPhone = normalizePhoneNumber(to);
    if (!normalizedPhone.ok) {
      console.error('[sendWhatsAppMessage] Telefone rejeitado na validação local:', normalizedPhone.error);
      return Response.json({ success: false, error: normalizedPhone.error }, { status: 400 });
    }

    let precheckResult = null;
    if (normalizedPhone.explicitInternational) {
      try {
        precheckResult = await checkWhatsAppNumber(baseUrl, instanceId, token, clientToken, normalizedPhone.phone);
        console.log('[sendWhatsAppMessage] Resultado da checagem pré-envio:', precheckResult);

        if (precheckResult.checked && precheckResult.exists === false) {
          return Response.json({
            success: false,
            error: `Número não validado pelo Evolution para WhatsApp: ${normalizedPhone.e164}`,
            original_phone: to,
            normalized_phone: normalizedPhone.phone,
            e164_phone: normalizedPhone.e164,
            explicit_international: normalizedPhone.explicitInternational,
            provider_response: precheckResult.payload,
            precheck_result: precheckResult
          }, { status: 400 });
        }
      } catch (error) {
        console.warn('[sendWhatsAppMessage] Falha ao checar número antes do envio, seguindo com o envio:', error?.message || error);
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    if (clientToken) headers['Client-Token'] = clientToken;

    const zApiUrl = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
    console.log(`[sendWhatsAppMessage] Enviando para URL: ${zApiUrl} (Phone: ${normalizedPhone.phone})`);

    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(zApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: normalizedPhone.phone,
          message
        })
      });

      const responseText = await response.text();
      const responseJson = parseJsonSafely(responseText);

      if (response.ok) {
        const result = responseJson || { raw_response: responseText };
        console.log('[sendWhatsAppMessage] Sucesso:', result);

        return Response.json({
          success: true,
          message_id: result?.key?.id || null,
          original_phone: to,
          normalized_phone: normalizedPhone.phone,
          e164_phone: normalizedPhone.e164,
          explicit_international: normalizedPhone.explicitInternational,
          attempt_count: attempt,
          api_response: result,
          precheck_result: precheckResult
        });
      }

      const providerError = extractProviderError(responseText, responseJson);
      console.error(`[sendWhatsAppMessage] Erro HTTP ${response.status} na tentativa ${attempt}:`, responseJson || responseText);

      if (attempt < maxAttempts && shouldRetryStatus(response.status)) {
        await delay(700 * attempt);
        continue;
      }

      return Response.json({
        success: false,
        error: providerError,
        original_phone: to,
        normalized_phone: normalizedPhone.phone,
        e164_phone: normalizedPhone.e164,
        explicit_international: normalizedPhone.explicitInternational,
        attempt_count: attempt,
        provider_status: response.status,
        provider_response: responseJson || responseText,
        precheck_result: precheckResult
      }, { status: response.status });
    }
  } catch (error) {
    console.error('[sendWhatsAppMessage] Erro Exception:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});