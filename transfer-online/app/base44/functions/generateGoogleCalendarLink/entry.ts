import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse do body
    const body = await req.json();
    const { serviceRequestId, token } = body;

    if (!serviceRequestId) {
      return Response.json({ error: 'serviceRequestId é obrigatório' }, { status: 400 });
    }

    // Buscar a ServiceRequest
    let serviceRequests;
    
    if (token) {
      // Se token foi fornecido, usar ele para autenticação
      serviceRequests = await base44.asServiceRole.entities.ServiceRequest.filter({
        id: serviceRequestId,
        driver_access_token: token
      });
    } else {
      // Caso contrário, verificar autenticação do usuário
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      serviceRequests = await base44.entities.ServiceRequest.filter({ id: serviceRequestId });
    }

    if (!serviceRequests || serviceRequests.length === 0) {
      return Response.json({ error: 'Viagem não encontrada' }, { status: 404 });
    }

    const serviceRequest = serviceRequests[0];

    // Construir título do evento
    const title = `🚗 Viagem ${serviceRequest.request_number} - ${serviceRequest.passenger_name}`;

    // Construir descrição detalhada
    const description = `Origem: ${serviceRequest.origin}\nDestino: ${serviceRequest.destination}\nPassageiro: ${serviceRequest.passenger_name}\n\nAcesse os detalhes completos da viagem no aplicativo:\n${Deno.env.get("BASE_URL") || "https://app.transferonline.com.br"}/DetalhesViagemMotorista?token=${serviceRequest.driver_access_token}`;

    // Parse da data e hora
    // Data vem no formato YYYY-MM-DD
    const [year, month, day] = serviceRequest.date.split('-');
    
    // Hora vem no formato HH:MM
    const [hours, minutes] = (serviceRequest.time || '00:00').split(':');

    // Criar data de início (no horário local)
    const startDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // Mês é 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );

    // Data de fim: adicionar duração estimada ou 2 horas por padrão
    const durationMinutes = serviceRequest.duration_minutes || 120;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    // Formatar datas para o Google Calendar (formato: YYYYMMDDTHHmmss)
    const formatGoogleDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = '00';
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    const startDateFormatted = formatGoogleDate(startDate);
    const endDateFormatted = formatGoogleDate(endDate);

    // Local do evento (Origem -> Destino para visualização completa)
    const location = `${serviceRequest.origin} -> ${serviceRequest.destination}`;

    // Construir URL do Google Calendar
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description,
      location: location,
      dates: `${startDateFormatted}/${endDateFormatted}`,
      // Adicionar lembrete: 60 minutos antes
      reminder: '60'
    });

    const calendarUrl = `${baseUrl}?${params.toString()}`;

    return Response.json({
      success: true,
      calendarUrl,
      eventDetails: {
        title,
        description,
        location,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

  } catch (error) {
    console.error('[generateGoogleCalendarLink] Erro:', error);
    return Response.json({
      error: error.message || 'Erro ao gerar link do Google Calendar'
    }, { status: 500 });
  }
});