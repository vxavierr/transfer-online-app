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
        const { passengerId, tripId } = body;

        if (!passengerId || !tripId) {
            return Response.json({ error: 'Passenger ID and Trip ID are required' }, { status: 400 });
        }

        // Fetch passenger details
        const passenger = await base44.entities.EventPassenger.get(passengerId);
        if (!passenger || !passenger.passenger_phone) {
            return Response.json({ error: 'Passenger not found or phone number missing' }, { status: 404 });
        }

        // Generate Boarding Pass
        const bpRes = await base44.functions.invoke('generateBoardingPass', { 
            tripId, 
            passengerIds: [passengerId] 
        });

        const bpData = bpRes.data;
        if (!bpData.success || !bpData.data || bpData.data.length === 0) {
            throw new Error(bpData.error || 'Failed to generate boarding pass');
        }

        const checkinUrl = bpData.data[0].checkin_url;
        const passengerName = bpData.data[0].passenger_name || 'Passageiro';
        const eventName = bpData.data[0].event_name || 'Evento';

        if (!checkinUrl) {
            throw new Error('Check-in URL not generated in Boarding Pass');
        }

        // Zenvia Configuration
        const zenviaToken = Deno.env.get('ZENVIA_API_TOKEN');
        const zenviaFrom = Deno.env.get('ZENVIA_FROM'); 

        if (!zenviaToken) {
            throw new Error('Zenvia API Token not configured (ZENVIA_API_TOKEN)');
        }
        
        console.log(`[Zenvia] Token Configured: Yes`);
        console.log(`[Zenvia] From Configured: ${zenviaFrom || 'No (Using Default)'}`);

        // Phone Formatting (E.164)
        const originalPhone = passenger.passenger_phone;
        let formattedPhone = originalPhone.replace(/\D/g, ''); 
        
        // Remove leading zero from DDD (011 -> 11)
        if (formattedPhone.startsWith('0')) {
            formattedPhone = formattedPhone.substring(1);
        }

        // Add Country Code (55) if missing for BR numbers (10 or 11 digits)
        if (!formattedPhone.startsWith('55') && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
            formattedPhone = `55${formattedPhone}`; 
        } 
        // Handle rare 550xx case
        else if (formattedPhone.startsWith('550') && formattedPhone.length > 13) {
             formattedPhone = `55${formattedPhone.substring(3)}`;
        }

        const toPhone = formattedPhone;
        console.log(`[Zenvia] Phone Format: ${originalPhone} -> ${toPhone}`);

        if (toPhone.length < 12 || toPhone.length > 13) {
             console.warn(`[Zenvia] Warning: Phone number length ${toPhone.length} seems unusual for BR E.164`);
        }

        const messageText = `Olá ${passengerName}, seu cartão de embarque para ${eventName} está disponível: ${checkinUrl}`;

        const payload = {
            to: toPhone,
            contents: [
                {
                    type: 'text',
                    text: messageText
                }
            ]
        };

        // Restore 'from' field as it is mandatory for Zenvia API
        // Forcing a generic, short sender ID ("Transfer") to avoid carrier blocking on non-whitelisted alphanumeric IDs.
        // Previous attempts with "TransferonlineAPP" (even truncated) may have been blocked.
        payload.from = "Transfer"; 
        console.log(`[Zenvia] Forcing Sender ID to 'Transfer' to maximize delivery probability.`);

        console.log(`[Zenvia] Sending Payload:`, JSON.stringify(payload));

        // Create initial log entry
        let smsLog;
        try {
            smsLog = await base44.asServiceRole.entities.SmsLog.create({
                to_number: toPhone,
                message_body: messageText,
                status: 'sending',
                request_payload: payload,
                sent_at: new Date().toISOString(),
                provider: 'zenvia',
                related_entity: 'EventPassenger',
                related_id: passengerId
            });
        } catch (logErr) {
            console.error('Failed to create SmsLog:', logErr);
        }

        const zenviaResponse = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-TOKEN': zenviaToken
            },
            body: JSON.stringify(payload)
        });

        const responseText = await zenviaResponse.text();
        console.log(`[Zenvia] Response Status: ${zenviaResponse.status}`);
        console.log('[Zenvia] Raw Response:', responseText);
        
        let zenviaResult;
        try {
            zenviaResult = JSON.parse(responseText);
        } catch (e) {
            zenviaResult = { raw: responseText };
        }

        if (!zenviaResponse.ok) {
            console.error('[Zenvia] API Error:', responseText);
            
            // Update log with error
            if (smsLog) {
                await base44.asServiceRole.entities.SmsLog.update(smsLog.id, {
                    status: 'failed',
                    provider_response: zenviaResult,
                    error_message: `API Error ${zenviaResponse.status}: ${JSON.stringify(zenviaResult)}`
                });
            }

            throw new Error(`Zenvia API Error (${zenviaResponse.status}): ${responseText}`);
        }

        // Update log with success
        if (smsLog) {
            await base44.asServiceRole.entities.SmsLog.update(smsLog.id, {
                status: 'success',
                provider_response: zenviaResult
            });
        }

        await base44.asServiceRole.entities.EventPassenger.update(passengerId, {
            sms_last_sent_at: new Date().toISOString(),
            sms_last_sent_status: 'success'
        });

        return Response.json({ 
            success: true, 
            message: 'SMS enviado para Zenvia com sucesso',
            sent_to: toPhone,
            original_phone: originalPhone,
            zenvia_from_used: payload.from || 'default',
            zenvia_id: zenviaResult.id || zenviaResult.messageId,
            zenvia_response: zenviaResult
        });

    } catch (error) {
        console.error('Error sending SMS:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});