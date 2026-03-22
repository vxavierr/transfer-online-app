import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.1';
import jspdfAutotable from 'npm:jspdf-autotable@3.8.2';

const autoTable = jspdfAutotable.default || jspdfAutotable;

const translations = {
  pt: {
    title: 'ORDEM DE SERVIÇO',
    request_number: 'Nº Solicitação',
    date: 'Data',
    time: 'Horário',
    origin: 'Origem',
    destination: 'Destino',
    stop: 'Parada',
    passengers: 'Passageiros',
    passenger_name: 'Passageiro Principal',
    passenger_phone: 'Telefone Passageiro',
    service_type: 'Tipo de Serviço',
    summary_info: 'RESUMO DO SERVIÇO',
    route_info: 'ROTEIRO DA VIAGEM',
    passenger_info: 'DADOS DO PASSAGEIRO',
    driver_info: 'DADOS DO MOTORISTA E VEÍCULO',
    driver_name: 'Motorista',
    driver_phone: 'Telefone Motorista',
    driver_photo: 'Foto do Motorista',
    vehicle_model: 'Veículo',
    vehicle_plate: 'Placa',
    notes: 'Observações',
    one_way: 'Só Ida',
    round_trip: 'Ida e Volta',
    hourly: 'Por Hora',
    supplier_info: 'DADOS DO FORNECEDOR',
    supplier_name: 'Fornecedor',
    supplier_phone: 'Telefone Fornecedor',
    additional_passengers: 'Passageiros Adicionais',
    document: 'Documento',
    name: 'Nome'
  },
  en: {
    title: 'SERVICE ORDER',
    request_number: 'Request #',
    date: 'Date',
    time: 'Time',
    origin: 'Origin',
    destination: 'Destination',
    stop: 'Stop',
    passengers: 'Passengers',
    passenger_name: 'Lead Passenger',
    passenger_phone: 'Passenger Phone',
    service_type: 'Service Type',
    summary_info: 'SERVICE SUMMARY',
    route_info: 'TRIP ROUTE',
    passenger_info: 'PASSENGER DETAILS',
    driver_info: 'DRIVER AND VEHICLE INFO',
    driver_name: 'Driver',
    driver_phone: 'Driver Phone',
    driver_photo: 'Driver Photo',
    vehicle_model: 'Vehicle',
    vehicle_plate: 'License Plate',
    notes: 'Notes',
    one_way: 'One Way',
    round_trip: 'Round Trip',
    hourly: 'Hourly',
    supplier_info: 'SUPPLIER DETAILS',
    supplier_name: 'Supplier',
    supplier_phone: 'Supplier Phone',
    additional_passengers: 'Additional Passengers',
    document: 'Document',
    name: 'Name'
  },
  es: {
    title: 'ORDEN DE SERVICIO',
    request_number: 'Nº Solicitud',
    date: 'Fecha',
    time: 'Hora',
    origin: 'Origen',
    destination: 'Destino',
    stop: 'Parada',
    passengers: 'Pasajeros',
    passenger_name: 'Pasajero Principal',
    passenger_phone: 'Teléfono Pasajero',
    service_type: 'Tipo de Servicio',
    summary_info: 'RESUMEN DEL SERVICIO',
    route_info: 'RUTA DEL VIAJE',
    passenger_info: 'DATOS DEL PASAJERO',
    driver_info: 'DATOS DEL CONDUCTOR Y VEHÍCULO',
    driver_name: 'Conductor',
    driver_phone: 'Teléfono Conductor',
    driver_photo: 'Foto del Conductor',
    vehicle_model: 'Vehículo',
    vehicle_plate: 'Matrícula',
    notes: 'Observaciones',
    one_way: 'Solo Ida',
    round_trip: 'Ida y Vuelta',
    hourly: 'Por Horas',
    supplier_info: 'DATOS DEL PROVEEDOR',
    supplier_name: 'Proveedor',
    supplier_phone: 'Teléfono Proveedor',
    additional_passengers: 'Pasajeros Adicionales',
    document: 'Documento',
    name: 'Nombre'
  }
};

function getServiceTypeLabel(serviceType, t) {
  if (serviceType === 'one_way') return t.one_way;
  if (serviceType === 'round_trip') return t.round_trip;
  if (serviceType === 'hourly') return t.hourly;
  return serviceType || '-';
}

function formatDateValue(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('pt-BR');
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function loadImageAsDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao carregar imagem: ${response.status}`);

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  return { dataUrl: `data:${contentType};base64,${base64}`, contentType };
}

function ensurePageSpace(doc, yPos, requiredHeight = 24) {
  if (yPos + requiredHeight > 280) {
    doc.addPage();
    return 20;
  }
  return yPos;
}

function drawSectionTitle(doc, title, yPos) {
  yPos = ensurePageSpace(doc, yPos, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(title, 14, yPos);
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.5);
  doc.line(14, yPos + 3, 196, yPos + 3);
  doc.setTextColor(0, 0, 0);
  return yPos + 8;
}

function drawDriverInfoCard(doc, { yPos, title, rows, photo }) {
  const cardX = 14;
  const cardWidth = 182;
  const photoBoxWidth = photo ? 40 : 0;
  const horizontalGap = photo ? 8 : 0;
  const contentWidth = cardWidth - 12 - photoBoxWidth - horizontalGap;
  const valueX = cardX + 48;
  const valueWidth = Math.max(50, contentWidth - 42);

  let textHeight = 0;
  const normalizedRows = rows.map(([label, value]) => {
    const lines = doc.splitTextToSize(String(value || '-'), valueWidth);
    const rowHeight = Math.max(8, lines.length * 4.5 + 1);
    textHeight += rowHeight;
    return { label, lines, rowHeight };
  });

  const contentHeight = Math.max(textHeight, photo ? 48 : 0);
  const cardHeight = contentHeight + 22;
  yPos = ensurePageSpace(doc, yPos, cardHeight + 6);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 4, 4, 'FD');

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(cardX, yPos, cardWidth, 12, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text(title, cardX + 6, yPos + 8);

  let lineY = yPos + 20;
  doc.setFontSize(9);
  normalizedRows.forEach(({ label, lines, rowHeight }) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(label, cardX + 6, lineY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(lines, valueX, lineY);
    lineY += rowHeight;
  });

  if (photo) {
    const frameX = cardX + cardWidth - 46;
    const frameY = yPos + 18;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(frameX, frameY, 40, 48, 4, 4, 'FD');
    doc.addImage(photo.dataUrl, photo.contentType.includes('png') ? 'PNG' : 'JPEG', frameX + 2, frameY + 2, 36, 44);
  }

  doc.setTextColor(0, 0, 0);
  return yPos + cardHeight + 8;
}

function drawNotesCard(doc, { yPos, title, content }) {
  const lines = doc.splitTextToSize(content || '-', 170);
  const cardHeight = Math.max(24, lines.length * 4.8 + 16);
  yPos = ensurePageSpace(doc, yPos, cardHeight + 6);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, yPos, 182, cardHeight, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text(title, 20, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(lines, 20, yPos + 16);
  doc.setTextColor(0, 0, 0);

  return yPos + cardHeight + 8;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { requestId, requestType, language = 'pt' } = await req.json();

    if (!requestId) {
      return Response.json({ error: 'ID da solicitação é obrigatório' }, { status: 400 });
    }

    const request = requestType === 'own'
      ? await base44.asServiceRole.entities.SupplierOwnBooking.get(requestId)
      : await base44.asServiceRole.entities.ServiceRequest.get(requestId);

    if (!request) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    const t = translations[language] || translations.pt;

    let supplier = null;
    const supplierId = request.chosen_supplier_id || request.supplier_id;
    if (supplierId) {
      supplier = await base44.asServiceRole.entities.Supplier.get(supplierId).catch(() => null);
    }

    let driverName = request.driver_name || '-';
    let driverPhone = request.driver_phone || '-';
    let vehicleModel = request.vehicle_model || '-';
    let vehiclePlate = request.vehicle_plate || '-';
    let driverPhotoUrl = request.driver_photo_url || null;

    if (request.driver_id) {
      const driverEntity = await base44.asServiceRole.entities.Driver.get(request.driver_id).catch(() => null);
      if (driverEntity) {
        driverName = driverEntity.name || driverName;
        driverPhone = driverEntity.phone_number || driverPhone;
        driverPhotoUrl = driverEntity.photo_url || driverPhotoUrl;
      }

      const vehicles = await base44.asServiceRole.entities.DriverVehicle.filter({ driver_id: request.driver_id, active: true }).catch(() => []);
      const currentVehicle = vehicles.find(v => v.is_default) || vehicles[0];
      if (currentVehicle) {
        vehicleModel = currentVehicle.vehicle_model || vehicleModel;
        vehiclePlate = currentVehicle.vehicle_plate || vehiclePlate;
      }
    }

    const doc = new jsPDF();
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(t.title, 105, 16, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${request.request_number || request.booking_number || request.id.slice(0, 8).toUpperCase()}`, 105, 26, { align: 'center' });

    let yPos = 44;
    const baseTableConfig = {
      theme: 'grid',
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
        textColor: [15, 23, 42],
        overflow: 'linebreak'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    };
    const labelColumnStyle = { fontStyle: 'bold', cellWidth: 52, textColor: [37, 99, 235] };

    yPos = drawSectionTitle(doc, t.summary_info, yPos);
    autoTable(doc, {
      ...baseTableConfig,
      startY: yPos,
      body: [
        [t.date, formatDateValue(request.date)],
        [t.time, request.time || '-'],
        [t.service_type, getServiceTypeLabel(request.service_type, t)],
        [t.passengers, String(request.passengers || 1)],
      ],
      columnStyles: { 0: labelColumnStyle }
    });

    yPos = doc.lastAutoTable.finalY + 8;

    const routeBody = [[t.origin, request.origin || '-']];
    const plannedStops = Array.isArray(request.planned_stops) ? request.planned_stops : [];
    const additionalStops = Array.isArray(request.additional_stops) ? request.additional_stops : [];
    const allStops = [...plannedStops, ...additionalStops];

    allStops.forEach((stop, index) => {
      routeBody.push([`${t.stop} ${index + 1}`, stop.address || stop.notes || '-']);
    });

    routeBody.push([t.destination, request.destination || '-']);

    yPos = drawSectionTitle(doc, t.route_info, yPos);
    autoTable(doc, {
      ...baseTableConfig,
      startY: yPos,
      body: routeBody,
      columnStyles: {
        0: labelColumnStyle,
        1: { cellWidth: 'auto' }
      }
    });

    yPos = doc.lastAutoTable.finalY + 8;

    yPos = drawSectionTitle(doc, t.passenger_info, yPos);
    autoTable(doc, {
      ...baseTableConfig,
      startY: yPos,
      body: [
        [t.passenger_name, request.passenger_name || '-'],
        [t.passenger_phone, request.passenger_phone || '-'],
      ],
      columnStyles: { 0: labelColumnStyle }
    });

    yPos = doc.lastAutoTable.finalY + 8;

    if (Array.isArray(request.passengers_details) && request.passengers_details.length > 0) {
      autoTable(doc, {
        ...baseTableConfig,
        startY: yPos,
        head: [[t.name, t.document]],
        body: request.passengers_details.map((p) => [
          p.name || '-',
          p.document_number ? `${p.document_type || 'DOC'}: ${p.document_number}` : '-'
        ]),
        headStyles: {
          fillColor: [239, 246, 255],
          textColor: [37, 99, 235],
          fontStyle: 'bold',
          lineColor: [226, 232, 240],
          lineWidth: 0.3
        }
      });

      yPos = doc.lastAutoTable.finalY + 8;
    }

    if (supplier) {
      yPos = drawSectionTitle(doc, t.supplier_info, yPos);
      autoTable(doc, {
        ...baseTableConfig,
        startY: yPos,
        body: [
          [t.supplier_name, supplier.name || '-'],
          [t.supplier_phone, supplier.phone_number || '-'],
        ],
        columnStyles: { 0: labelColumnStyle }
      });

      yPos = doc.lastAutoTable.finalY + 8;
    }

    const driverPhoto = driverPhotoUrl
      ? await loadImageAsDataUrl(driverPhotoUrl).catch(() => null)
      : null;

    yPos = drawDriverInfoCard(doc, {
      yPos,
      title: t.driver_info,
      rows: [
        [t.driver_name, driverName],
        [t.driver_phone, driverPhone],
        [t.vehicle_model, vehicleModel],
        [t.vehicle_plate, vehiclePlate],
      ],
      photo: driverPhoto
    });

    if (request.notes) {
      yPos = drawNotesCard(doc, {
        yPos,
        title: t.notes,
        content: request.notes
      });
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return Response.json({ success: true, pdfBase64 });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return Response.json({ error: error.message || 'Erro ao gerar PDF' }, { status: 500 });
  }
});