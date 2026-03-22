import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTable from 'npm:jspdf-autotable@3.8.2';
import { format } from 'npm:date-fns@2.30.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, startDate, endDate } = await req.json();

    // Fetch all necessary data
    // Note: In a real production app with lots of data, we should use pagination or more specific queries.
    // For now, matching the frontend logic.
    const [requests, clients, suppliers, users, vehicleTypes] = await Promise.all([
      base44.entities.ServiceRequest.list(),
      base44.entities.Client.list(),
      base44.entities.Supplier.list(),
      base44.entities.User.list(),
      base44.entities.SupplierVehicleType.list()
    ]);

    // Filter requests
    let filtered = requests;

    if (clientId && clientId !== 'all') {
      filtered = filtered.filter(req => req.client_id === clientId);
    }

    if (startDate) {
      filtered = filtered.filter(req => req.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(req => req.date <= endDate);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Helper functions for mapping
    const getClientName = (id) => clients.find(c => c.id === id)?.name || 'N/A';
    const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || 'N/A';
    const getUserName = (id) => users.find(u => u.id === id)?.full_name || 'N/A';
    const getVehicleTypeName = (id) => vehicleTypes.find(v => v.id === id)?.name || id || 'N/A';
    
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatServiceType = (type) => {
      const types = {
        'one_way': 'Só Ida',
        'round_trip': 'Ida e Volta',
        'hourly': 'Por Hora'
      };
      return types[type] || type;
    };

    // Calculations
    const totalKm = filtered.reduce((acc, req) => acc + (req.distance_km || 0), 0);
    const totalValueClient = filtered.reduce((acc, req) => acc + (req.chosen_client_price || 0), 0);
    const totalCostSupplier = filtered.reduce((acc, req) => acc + (req.chosen_supplier_cost || 0), 0);

    // PDF Generation
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

    doc.setFontSize(18);
    doc.text('Relatório de Km Percorrido', 14, 20);

    doc.setFontSize(10);
    const clientName = clientId === 'all' || !clientId ? 'Todos' : getClientName(clientId);
    doc.text(`Cliente: ${clientName}`, 14, 30);
    
    const periodStr = `Período: ${startDate ? format(new Date(startDate), 'dd/MM/yyyy') : 'Início'} a ${endDate ? format(new Date(endDate), 'dd/MM/yyyy') : 'Fim'}`;
    doc.text(periodStr, 14, 36);
    
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 200, 20);

    const tableColumn = [
      "Nº Viagem", "Data", "Hora", "Solicitante", "Fornecedor", 
      "Status", "Tipo Serviço", "Veículo", "Valor (Cli)", "Custo (Forn)", "Km"
    ];

    const tableRows = filtered.map(req => [
      req.request_number || req.id.slice(-6),
      req.date ? format(new Date(req.date), 'dd/MM/yyyy') : '',
      req.time || '',
      getUserName(req.user_id),
      getSupplierName(req.chosen_supplier_id),
      req.status,
      formatServiceType(req.service_type),
      getVehicleTypeName(req.chosen_vehicle_type_id),
      formatCurrency(req.chosen_client_price),
      formatCurrency(req.chosen_supplier_cost),
      `${req.distance_km || 0} km`
    ]);

    // Totals row
    tableRows.push([
      'TOTAIS', '', '', '', '', '', '', '',
      formatCurrency(totalValueClient),
      formatCurrency(totalCostSupplier),
      `${totalKm.toFixed(2)} km`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      theme: 'grid'
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=relatorio_km_percorrido.pdf'
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});