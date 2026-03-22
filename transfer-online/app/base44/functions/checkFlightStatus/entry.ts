import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { date, token } = body;
        const flightNumber = body.flightNumber || body.flight_number; // Aceitar ambos os formatos

        // Verificar autenticação (usuário logado OU token válido)
        let authorized = false;

        // 1. Tentar autenticação por token (coordenador via link público)
        if (token) {
            const sharedLists = await base44.asServiceRole.entities.SharedReceptiveList.filter({ token });
            if (sharedLists.length > 0) {
                const list = sharedLists[0];
                if (list.active && new Date() <= new Date(list.expires_at)) {
                    authorized = true;
                }
            }
        }

        // 2. Tentar autenticação por usuário logado
        if (!authorized) {
            try {
                const user = await base44.auth.me();
                if (user) {
                    authorized = true;
                }
            } catch (e) {
                // Não autenticado
            }
        }

        if (!authorized) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("Flight status request:", { flightNumber, date, hasToken: !!token });
        
        if (!flightNumber) {
            return Response.json({ success: false, error: 'Número do voo é obrigatório' }, { status: 400 });
        }

        const apiKey = Deno.env.get("API_ACIATIONSTACK");
        if (!apiKey) {
            console.error("API key not found in environment");
            return Response.json({ success: false, error: 'Serviço de rastreamento não configurado. Entre em contato com o suporte.' }, { status: 500 });
        }

        // Limpar e normalizar o número do voo
        let cleanFlightNumber = flightNumber.replace(/\s/g, '').toUpperCase();
        
        // Mapear nomes de companhias para códigos IATA (AviationStack usa códigos IATA)
        const airlineMap = {
            'GOL': 'G3',
            'LATAM': 'LA',
            'AZUL': 'AD',
            'AVIANCA': 'AV',
            'TAM': 'JJ'
        };
        
        // Tentar extrair código da companhia aérea e número do voo
        for (const [name, code] of Object.entries(airlineMap)) {
            if (cleanFlightNumber.startsWith(name)) {
                cleanFlightNumber = code + cleanFlightNumber.substring(name.length);
                console.log(`Converted ${flightNumber} to ${cleanFlightNumber}`);
                break;
            }
        }
        
        console.log("Searching for flight:", cleanFlightNumber);

        let url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${cleanFlightNumber}`;
        
        if (date) {
            url += `&flight_date=${date}`;
        }

        console.log("Fetching from AviationStack API:", url.replace(apiKey, 'HIDDEN'));

        const response = await fetch(url);
        
        if (!response.ok) {
            console.error("AviationStack HTTP Error:", response.status, response.statusText);
            return Response.json({ 
                success: false, 
                error: 'Erro ao conectar com serviço de rastreamento',
                details: `HTTP ${response.status}`
            }, { status: 502 });
        }

        const data = await response.json();
        
        console.log("AviationStack Response:", JSON.stringify(data, null, 2));

        if (data.error) {
            console.error("AviationStack API Error:", data.error);
            return Response.json({ 
                success: false, 
                error: data.error.message || 'Erro ao consultar serviço de voos',
                details: data.error
            }, { status: 502 });
        }

        if (!data.data || data.data.length === 0) {
            console.log("No flight data found for:", cleanFlightNumber);
            return Response.json({ 
                success: false, 
                error: `Voo ${flightNumber} (${cleanFlightNumber}) não encontrado. Verifique o número do voo e a data. Nota: O rastreamento funciona melhor para voos nas próximas 24h.`
            });
        }

        // Filtrar pelo dia se fornecido, caso a API retorne múltiplos dias
        let flight = data.data[0]; // Pega o mais recente/relevante por padrão
        
        if (date && data.data.length > 1) {
            const targetDate = new Date(date).toISOString().split('T')[0];
            const match = data.data.find(f => f.departure?.scheduled?.startsWith(targetDate));
            if (match) flight = match;
        }

        // Formatar a resposta para o frontend
        const formattedData = {
            success: true,
            flight: {
                flight_date: flight.flight_date,
                flight_status: flight.flight_status,
                departure: {
                    airport: flight.departure?.airport,
                    iata: flight.departure?.iata,
                    icao: flight.departure?.icao,
                    terminal: flight.departure?.terminal,
                    gate: flight.departure?.gate,
                    delay: flight.departure?.delay,
                    scheduled: flight.departure?.scheduled,
                    estimated: flight.departure?.estimated,
                    actual: flight.departure?.actual,
                    timezone: flight.departure?.timezone
                },
                arrival: {
                    airport: flight.arrival?.airport,
                    iata: flight.arrival?.iata,
                    icao: flight.arrival?.icao,
                    terminal: flight.arrival?.terminal,
                    gate: flight.arrival?.gate,
                    baggage: flight.arrival?.baggage,
                    delay: flight.arrival?.delay,
                    scheduled: flight.arrival?.scheduled,
                    estimated: flight.arrival?.estimated,
                    actual: flight.arrival?.actual,
                    timezone: flight.arrival?.timezone
                },
                airline: {
                    name: flight.airline?.name,
                    iata: flight.airline?.iata,
                    icao: flight.airline?.icao
                },
                flight: {
                    number: flight.flight?.number,
                    iata: flight.flight?.iata,
                    icao: flight.flight?.icao
                },
                aircraft: {
                    registration: flight.aircraft?.registration,
                    iata: flight.aircraft?.iata,
                    icao: flight.aircraft?.icao,
                    icao24: flight.aircraft?.icao24
                }
            }
        };

        return Response.json(formattedData);

    } catch (error) {
        console.error('Erro na função checkFlightStatus:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});