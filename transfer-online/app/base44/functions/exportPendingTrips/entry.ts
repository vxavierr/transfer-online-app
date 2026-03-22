import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized - Usuário não logado' }, { status: 401 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { eventId } = body;

    console.log(`[ExportPending] Iniciando exportação para evento: ${eventId}, Usuário: ${user.email}`);

    if (!eventId) {
      return Response.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Fetch event to check permissions
    const event = await base44.asServiceRole.entities.Event.get(eventId);
    if (!event) {
      console.error(`[ExportPending] Evento ${eventId} não encontrado`);
      // Mudando para 400 para diferenciar de "Função não encontrada" (404 de infra)
      return Response.json({ error: 'Evento não encontrado no banco de dados' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const isEventManager = user.event_access_active;
    const isSupplierOwner = user.supplier_id === event.supplier_id;

    if (!isAdmin && !isEventManager && !isSupplierOwner) {
      return Response.json({ error: 'Acesso negado. Você não tem permissão para este evento.' }, { status: 403 });
    }

    // Fetch ALL trips
    const allTrips = await base44.asServiceRole.entities.EventTrip.filter(
        { event_id: eventId }, 
        '-date', 
        5000 
    );

    console.log(`[ExportPending] Total de viagens encontradas: ${allTrips.length}`);

    // Filter for pending drivers
    const actuallyPendingTrips = allTrips.filter(t => 
        (!t.driver_id || t.driver_id === '') && 
        !t.is_casual_driver && 
        t.status !== 'cancelled' && 
        t.driver_trip_status !== 'cancelada_motorista'
    );

    console.log(`[ExportPending] Viagens pendentes filtradas: ${actuallyPendingTrips.length}`);

    if (actuallyPendingTrips.length === 0) {
        return Response.json({ 
            success: false, 
            message: 'Nenhuma viagem pendente encontrada para este evento.',
            count: 0 
        }, { status: 200 });
    }

    // Format data for Excel
    const data = actuallyPendingTrips.map(trip => ({
      "Data": trip.date ? new Date(trip.date).toLocaleDateString('pt-BR') : '',
      "Hora": trip.time || trip.start_time || '',
      "Origem": trip.origin || '',
      "Destino": trip.destination || '',
      "Passageiros": trip.passengers || trip.passenger_count || 0,
      "Veículo": trip.vehicle_type_name || trip.vehicle_type_category || '',
      "Código": trip.trip_code || '',
      "Notas": trip.partner_notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Adjust column widths
    const colWidths = [
      { wch: 12 }, // Data
      { wch: 8 },  // Hora
      { wch: 40 }, // Origem
      { wch: 40 }, // Destino
      { wch: 12 }, // Passageiros
      { wch: 20 }, // Veículo
      { wch: 15 }, // Código
      { wch: 30 }  // Notas
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendências');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Return binary data
    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pendencias_${(event.name || 'evento').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`,
        'Access-Control-Allow-Origin': '*', // Ensure CORS headers on success too
      },
    });

  } catch (error) {
    console.error('[ExportPending] Critical Error:', error);
    return Response.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
  }
});