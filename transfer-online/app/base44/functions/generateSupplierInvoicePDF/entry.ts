import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.2';

const normalizeText = (text) => {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const formatCurrency = (value) => {
  const num = value || 0;
  return `R$ ${num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const formatDateOnly = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
};

Deno.serve(async (req) => {
  console.log('[PDF] Iniciando geração...');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.supplier_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { serviceRequestIds, groupingType, recipientEmail, sendEmail, period_start, period_end, invoiceId } = body;

    const invoice = invoiceId
      ? await base44.asServiceRole.entities.SupplierInvoice.get(invoiceId).catch(() => null)
      : null;

    if (invoice && invoice.supplier_id !== user.supplier_id) {
      return Response.json({ error: 'Acesso negado à fatura' }, { status: 403 });
    }

    const effectiveTripIds = invoice
      ? [
          ...(invoice.related_service_requests_ids || []),
          ...(invoice.related_supplier_own_booking_ids || [])
        ]
      : serviceRequestIds;

    const effectivePeriodStart = invoice?.period_start || period_start;
    const effectivePeriodEnd = invoice?.period_end || period_end;

    if (!effectiveTripIds?.length) {
      return Response.json({ error: 'Nenhuma viagem selecionada' }, { status: 400 });
    }

    console.log('[PDF] Buscando fornecedor...');
    const supplier = await base44.entities.Supplier.get(user.supplier_id).catch(() => null);

    if (!supplier) {
      return Response.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    console.log('[PDF] Buscando viagens...');
    // Tenta buscar como ServiceRequest
    const serviceRequests = await Promise.all(
      effectiveTripIds.map(id => 
        base44.entities.ServiceRequest.get(id).catch(() => null)
      )
    );

    // Os que não foram encontrados, tenta buscar como SupplierOwnBooking
    const missingIds = effectiveTripIds.filter((id, index) => !serviceRequests[index]);
    
    let ownBookings = [];
    if (missingIds.length > 0) {
        ownBookings = await Promise.all(
          missingIds.map(id => 
            base44.entities.SupplierOwnBooking.get(id).catch(() => null)
          )
        );
    }

    const validRequests = serviceRequests.filter(r => r);
    const validOwnBookings = ownBookings.filter(r => r);

    if (!validRequests.length && !validOwnBookings.length) {
      return Response.json({ error: 'Viagens não encontradas' }, { status: 404 });
    }

    console.log('[PDF] Buscando dados relacionados...');
    // ServiceRequests usam Client. OwnBookings usam SupplierOwnClient.
    const clientIds = [...new Set(validRequests.map(r => r.client_id).filter(Boolean))];
    const ownClientIds = [...new Set(validOwnBookings.map(r => r.client_id).filter(Boolean))];
    
    const userIds = [...new Set(validRequests.map(r => r.user_id).filter(Boolean))];
    const billingUserIds = [...new Set(validRequests.map(r => r.billing_responsible_user_id).filter(Boolean))];

    const [clients, ownClients, users] = await Promise.all([
      Promise.all(clientIds.map(id => base44.entities.Client.get(id).catch(() => null))),
      Promise.all(ownClientIds.map(id => base44.entities.SupplierOwnClient.get(id).catch(() => null))),
      Promise.all([...userIds, ...billingUserIds].map(id => 
        base44.asServiceRole.entities.User.get(id).catch(() => null)
      ))
    ]);
    
    const allClients = [...clients.filter(Boolean), ...ownClients.filter(Boolean)];

    // Criar map de clientes para fácil acesso
    const clientsMap = {};
    allClients.forEach(c => { if (c) clientsMap[c.id] = c; });
    const usersMap = {};
    users.forEach(u => { if (u) usersMap[u.id] = u; });

    console.log('[PDF] Agrupando viagens...');
    const groupedData = {};
    
    // Normalizar objetos para processamento uniforme
    const allTrips = [
        ...validRequests.map(r => ({...r, _type: 'request', _val: (r.chosen_supplier_cost + (r.total_additional_expenses_approved || 0))})),
        ...validOwnBookings.map(b => ({...b, _type: 'own', _val: (b.price || 0), request_number: b.booking_number}))
    ];
    
    allTrips.forEach(request => {
      let groupKey = 'Todas as Viagens';

      if (groupingType === 'user') {
        const u = users.find(u => u.id === request.user_id);
        groupKey = u?.full_name || 'Desconhecido';
      } else if (groupingType === 'cost_center') {
        if (request.cost_allocation?.length) {
          request.cost_allocation.forEach(alloc => {
            const ccKey = `Centro: ${alloc.cost_center_code}`;
            if (!groupedData[ccKey]) groupedData[ccKey] = [];
            const totalValue = request._val;
            const allocatedValue = alloc.allocation_type === 'percentage' 
              ? totalValue * alloc.allocation_value / 100
              : alloc.allocation_value;
            groupedData[ccKey].push({ ...request, allocated_amount: allocatedValue });
          });
          return;
        } else {
          groupKey = 'Sem Centro';
        }
      } else if (groupingType === 'billing_responsible') {
        const u = users.find(u => u.id === request.billing_responsible_user_id);
        groupKey = u?.full_name || request.billing_responsible_name || 'Não Informado';
      } else if (groupingType === 'billing_method') {
        const labels = { invoiced: 'Faturado', credit_card: 'Cartão', purchase_order: 'OC' };
        groupKey = labels[request.billing_method] || 'Não Informado';
      } else if (groupingType === 'client') {
        const c = clientsMap[request.client_id];
        groupKey = c?.name || 'Cliente Desconhecido';
      }

      if (!groupedData[groupKey]) groupedData[groupKey] = [];
      groupedData[groupKey].push(request);
    });

    console.log('[PDF] Criando PDF...');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    const checkSpace = (space) => {
      if (yPos + space > pageHeight - 20) {
        doc.addPage();
        addPageBorder();
        yPos = margin + 5;
      }
    };

    // Função para adicionar moldura em cada página
    const addPageBorder = () => {
      // Moldura externa
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(1);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
      
      // Moldura interna
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.2);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    };

    // Adicionar moldura na primeira página
    addPageBorder();

    // Cabeçalho compacto - FORNECEDOR à esquerda, CLIENTE à direita
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 22, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 22);
    
    // FORNECEDOR (esquerda)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('FORNECEDOR:', margin + 3, yPos + 5);
    doc.setFontSize(9);
    doc.text(normalizeText(supplier.name || 'N/A'), margin + 3, yPos + 10);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    if (supplier.document_id) {
      doc.text(`CNPJ/CPF: ${supplier.document_id}`, margin + 3, yPos + 14);
    }
    if (supplier.phone_number) {
      doc.text(`Tel: ${supplier.phone_number}`, margin + 3, yPos + 17);
    }
    // Data de emissão abaixo do fornecedor
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`, margin + 3, yPos + 20);
    doc.setTextColor(0, 0, 0);
    
    // CLIENTE (direita)
    const uniqueClientIds = [...new Set(allTrips.map(r => r.client_id).filter(Boolean))];
    const centerX = pageWidth / 2 + 5;
    
    if (uniqueClientIds.length === 1) {
      const client = clientsMap[uniqueClientIds[0]];
      if (client) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENTE:', centerX, yPos + 5);
        doc.setFontSize(9);
        doc.text(normalizeText(client.name), centerX, yPos + 10);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        if (client.document_id) {
          doc.text(`CNPJ/CPF: ${client.document_id}`, centerX, yPos + 14);
        }
        if (client.contact_name || client.contact_person_name) {
          doc.text(`Contato: ${normalizeText(client.contact_name || client.contact_person_name || '')}`, centerX, yPos + 17);
        }
      }
    } else if (uniqueClientIds.length > 1) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MULTI-CLIENTE', centerX, yPos + 5);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`${uniqueClientIds.length} clientes`, centerX, yPos + 10);
    }
    
    // Título e período (abaixo)
    yPos += 23;
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('RELATORIO DE FATURAMENTO', margin + 3, yPos + 5.5);
    
    if (effectivePeriodStart && effectivePeriodEnd) {
      doc.setFontSize(9);
      const periodText = `Periodo: ${formatDateOnly(effectivePeriodStart)} a ${formatDateOnly(effectivePeriodEnd)}`;
      const periodWidth = doc.getTextWidth(periodText);
      doc.text(periodText, pageWidth - margin - periodWidth - 3, yPos + 5.5);
    }
    
    doc.setTextColor(0, 0, 0);
    yPos += 12;

    let totalGeral = 0;
    const authoritativeInvoiceTotal = invoice?.total_amount ?? null;

    for (const [groupName, groupRequests] of Object.entries(groupedData)) {
      checkSpace(25);
      
      // Cabeçalho do grupo
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(normalizeText(groupName), margin + 3, yPos + 5);
      yPos += 8;
      doc.setTextColor(0, 0, 0);

      // Cabeçalho da tabela
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('N. Pedido', margin + 2, yPos + 4);
      doc.text('Data/Hora', margin + 20, yPos + 4);
      doc.text('Cliente', margin + 38, yPos + 4);
      doc.text('C. Custo', margin + 68, yPos + 4);
      doc.text('Rota', margin + 82, yPos + 4);
      doc.text('Veículo', margin + 145, yPos + 4);
      doc.text('Passageiro', margin + 175, yPos + 4);
      doc.text('Valor', margin + 220, yPos + 4);
      yPos += 7;

      let subtotal = 0;

      groupRequests.forEach((req, idx) => {
        checkSpace(8);
        
        if (idx % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, yPos - 1, pageWidth - 2 * margin, 7, 'F');
        }

        const valor = req.allocated_amount || req._val;
        subtotal += valor;

        const client = clientsMap[req.client_id];
        const clientName = client?.name || 'N/A';

        // Centro de custo
        let costCenterText = '';
        if (req.cost_allocation && req.cost_allocation.length > 0) {
          const ccCodes = req.cost_allocation.map(a => a.cost_center_code).join(',');
          costCenterText = ccCodes.substring(0, 12);
        } else {
          costCenterText = '-';
        }

        // Veículo
        const vehicleName = req.chosen_vehicle_type_name || req.vehicle_type_name || 'Padrão';

        // Passageiro
        let passengerText = normalizeText(req.passenger_name || '-');
        if (req.passengers && req.passengers > 1) {
            passengerText = `${passengerText} + ${req.passengers - 1}`;
        }

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        
        // Colunas alinhadas com o cabeçalho
        doc.text(normalizeText(req.request_number || '-').substring(0, 10), margin + 2, yPos + 4);
        doc.text(`${formatDateOnly(req.date)} ${req.time || ''}`.trim(), margin + 20, yPos + 4);
        doc.text(normalizeText(clientName).substring(0, 18), margin + 38, yPos + 4);
        doc.text(costCenterText, margin + 68, yPos + 4);
        const routeText = `${normalizeText(req.origin).substring(0, 30)} > ${normalizeText(req.destination).substring(0, 30)}`;
        doc.text(routeText.substring(0, 55), margin + 82, yPos + 4);
        doc.text(normalizeText(vehicleName).substring(0, 20), margin + 145, yPos + 4);
        doc.text(passengerText.substring(0, 25), margin + 175, yPos + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(valor), margin + 220, yPos + 4);
        
        yPos += 7;
      });

      checkSpace(10);
      doc.setFillColor(220, 252, 231);
      doc.rect(margin, yPos - 1, pageWidth - 2 * margin, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('SUBTOTAL:', margin + 180, yPos + 4);
      doc.text(formatCurrency(subtotal), margin + 220, yPos + 4);
      totalGeral += subtotal;
      yPos += 10;
    }

    checkSpace(10);
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL GERAL:', margin + 3, yPos + 5.5);
    doc.text(formatCurrency(authoritativeInvoiceTotal ?? totalGeral), margin + 220, yPos + 5.5);

    console.log('[PDF] PDF criado, gerando bytes...');
    const pdfBytes = doc.output('arraybuffer');

    if (sendEmail && recipientEmail) {
      console.log('[PDF] Fazendo upload...');
      
      const file = new File([pdfBytes], 'relatorio.pdf', { type: 'application/pdf' });
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });

      console.log('[PDF] Enviando email...');
      await base44.integrations.Core.SendEmail({
        from_name: normalizeText(supplier.name),
        to: recipientEmail,
        subject: `Relatorio de Faturamento - ${normalizeText(supplier.name)}`,
        body: `
          <h2>Relatorio de Faturamento</h2>
          <p>Segue relatorio em anexo.</p>
          <p>Total de viagens: ${allTrips.length}</p>
          <p>Valor total: ${formatCurrency(authoritativeInvoiceTotal ?? totalGeral)}</p>
          <p><a href="${uploadResponse.file_url}">Baixar PDF</a></p>
        `
      });

      console.log('[PDF] Concluído!');
      return Response.json({
        success: true,
        message: 'Relatório enviado com sucesso!',
        totalAmount: authoritativeInvoiceTotal ?? totalGeral,
        tripCount: allTrips.length,
        pdfUrl: uploadResponse.file_url
      });
    }

    console.log('[PDF] Retornando download...');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="relatorio.pdf"'
      }
    });

  } catch (error) {
    console.error('[PDF] ERRO:', error);
    console.error('[PDF] Stack:', error.stack);
    return Response.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
});