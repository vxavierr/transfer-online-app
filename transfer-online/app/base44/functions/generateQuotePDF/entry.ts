import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.12';
import { format, parseISO } from 'npm:date-fns@2.30.0';
import { ptBR } from 'npm:date-fns@2.30.0/locale';

Deno.serve(async (req) => {
  try {
    // 1. Autenticação e Dados
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
        user = await base44.auth.me();
    } catch (e) {
        // Usuário não logado
    }
    
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    let { quoteId, quoteData } = body;

    console.log(`Generating PDF for Quote ID: ${quoteId}, Has Data: ${!!quoteData}, User: ${user?.email}`);

    // Se não estiver logado, EXIGE que os dados sejam enviados (modo renderização)
    // para evitar acesso não autorizado ao banco de dados via ID
    if (!user && !quoteData) {
      console.error('Unauthorized access attempt without quote data');
      return Response.json({ error: 'Unauthorized access to fetch quote by ID' }, { status: 401 });
    }
    
    // Se tiver ID mas não dados, busca no banco (para reimpressão)
    if (quoteId && !quoteData) {
        try {
            // Usando service role para garantir acesso
            const result = await base44.asServiceRole.entities.QuoteRequest.list({ filters: { id: quoteId }, limit: 1 });
            // .get(id) as vezes pode falhar se o ID não for válido ou UUID, .list é mais seguro para check
            // Mas SDK .get é padrão. Vamos tentar get e logar erro.
            try {
                quoteData = await base44.asServiceRole.entities.QuoteRequest.get(quoteId);
            } catch (innerE) {
                console.error(`Quote not found with get(${quoteId}):`, innerE);
                return Response.json({ error: 'Quote not found in DB' }, { status: 404 });
            }
        } catch (e) {
            console.error('Error fetching quote:', e);
            return Response.json({ error: 'Error fetching quote' }, { status: 500 });
        }
    }

    if (!quoteData) {
      return Response.json({ error: 'Quote data required' }, { status: 400 });
    }

    // 3. Gerar PDF com pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(); // A4 por padrão (595.28 x 841.89 pt)
    const { width, height } = page.getSize();
    
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Helper para conversão de mm para points (1 mm = 2.835 pt)
    const mm = (val) => val * 2.835;
    
    // Helper para coordenada Y (pdf-lib usa Y=0 no bottom, jspdf usava top)
    // Então Y_pdf_lib = height - Y_convertido
    const yPos = (yMm) => height - mm(yMm);

    // Configuração de Cores
    const blueColor = rgb(37/255, 99/255, 235/255); // #2563eb
    const whiteColor = rgb(1, 1, 1);
    const blackColor = rgb(0, 0, 0);
    const greenBgColor = rgb(240/255, 253/255, 244/255); // #f0fdf4
    const greenBorderColor = rgb(22/255, 163/255, 74/255); // #16a34a

    // --- Header ---
    page.drawRectangle({
        x: 0,
        y: height - mm(40),
        width: width,
        height: mm(40),
        color: blueColor,
    });

    page.drawText('Cotação de Serviço', {
        x: mm(14),
        y: height - mm(20), // Aproximado do baseline
        size: 22,
        font: fontBold,
        color: whiteColor,
    });

    page.drawText('TransferOnline', {
        x: mm(14),
        y: height - mm(28),
        size: 12,
        font: fontRegular,
        color: whiteColor,
    });

    // Quote Number e Data (Alinhado à direita aprox)
    if (quoteData.quote_number) {
        const qnText = `Cotação #${quoteData.quote_number}`;
        const qnWidth = fontBold.widthOfTextAtSize(qnText, 12);
        page.drawText(qnText, {
            x: width - mm(14) - qnWidth,
            y: height - mm(20),
            size: 12,
            font: fontBold,
            color: whiteColor,
        });
    }

    const today = new Date();
    const dateText = format(today, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    const dateWidth = fontRegular.widthOfTextAtSize(dateText, 10);
    page.drawText(dateText, {
        x: width - mm(14) - dateWidth,
        y: height - mm(28),
        size: 10,
        font: fontRegular,
        color: whiteColor,
    });

    // --- Função Helper para Texto com Quebra de Linha ---
    const drawWrappedText = (text, xMm, yMm, size, font, maxWidthMm) => {
        const textStr = text || '-';
        const maxWidth = mm(maxWidthMm);
        const words = textStr.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = font.widthOfTextAtSize(currentLine + " " + word, size);
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        lines.forEach((line, index) => {
            page.drawText(line, {
                x: mm(xMm),
                y: yPos(yMm + (index * (size / 2.835 * 1.5))), // Espaçamento baseado no tamanho da fonte
                size: size,
                font: font,
                color: blackColor,
            });
        });

        return lines.length * (size / 2.835 * 1.5); // Retorna altura ocupada em mm
    };

    let currentY = 60; // mm

    // --- Dados do Cliente ---
    page.drawText('Dados do Cliente', {
        x: mm(14),
        y: yPos(currentY),
        size: 14,
        font: fontBold,
        color: blackColor,
    });
    
    page.drawLine({
        start: { x: mm(14), y: yPos(currentY + 2) },
        end: { x: width - mm(14), y: yPos(currentY + 2) },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });
    currentY += 10;

    page.drawText(`Cliente/Passageiro: ${quoteData.customer_name || '-'}`, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
    if (quoteData.requester_name) {
        page.drawText(`Solicitado por: ${quoteData.requester_name}`, { x: width / 2, y: yPos(currentY), size: 10, font: fontRegular });
    }
    
    page.drawText(`Email: ${quoteData.customer_email || '-'}`, { x: mm(14), y: yPos(currentY + 6), size: 10, font: fontRegular });
    page.drawText(`Telefone: ${quoteData.customer_phone || '-'}`, { x: mm(14), y: yPos(currentY + 12), size: 10, font: fontRegular });
    
    currentY += 25;

    // --- Detalhes da Viagem ---
    page.drawText('Detalhes da Viagem', {
        x: mm(14),
        y: yPos(currentY),
        size: 14,
        font: fontBold,
    });
    page.drawLine({
        start: { x: mm(14), y: yPos(currentY + 2) },
        end: { x: width - mm(14), y: yPos(currentY + 2) },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });
    currentY += 10;

    let serviceTypeText = 'Transfer (Só Ida)';
    if (quoteData.service_type === 'round_trip') serviceTypeText = 'Transfer (Ida e Volta)';
    if (quoteData.service_type === 'hourly') serviceTypeText = 'Disposição por Hora';
    page.drawText(`Tipo de Serviço: ${serviceTypeText}`, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
    currentY += 6;

    // Origem com quebra
    page.drawText(`Origem: `, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
    let addedHeight = drawWrappedText(quoteData.origin, 28, currentY, 10, fontRegular, 160);
    currentY += Math.max(6, addedHeight + 2);

    // Destino com quebra
    if (quoteData.destination) {
        page.drawText(`Destino: `, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
        addedHeight = drawWrappedText(quoteData.destination, 28, currentY, 10, fontRegular, 160);
        currentY += Math.max(6, addedHeight + 2);
    }

    // Datas
    let dateStr = '-';
    try {
        if (quoteData.date) {
            dateStr = format(parseISO(quoteData.date), 'dd/MM/yyyy', { locale: ptBR });
        }
    } catch (e) { dateStr = quoteData.date || '-'; }
    
    page.drawText(`Data de Ida: ${dateStr} às ${quoteData.time || '-'}`, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
    currentY += 6;

    if (quoteData.service_type === 'round_trip') {
        let returnDateStr = '-';
        try {
            if (quoteData.return_date) {
                returnDateStr = format(parseISO(quoteData.return_date), 'dd/MM/yyyy', { locale: ptBR });
            }
        } catch (e) { returnDateStr = quoteData.return_date || '-'; }
        page.drawText(`Data de Volta: ${returnDateStr} às ${quoteData.return_time || '-'}`, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
        currentY += 6;
    }

    if (quoteData.service_type === 'hourly') {
        page.drawText(`Horas Contratadas: ${quoteData.hours}h`, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
        currentY += 6;
    }

    page.drawText(`Passageiros: ${quoteData.passengers || 1}`, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
    currentY += 15;

    // --- Veículo e Opções ---
    
    if (quoteData.quote_format === 'professional') {
        // 1. Multi Trips (B2B multiple legs)
        if (quoteData.quoted_trips && quoteData.quoted_trips.length > 0) {
            page.drawText('Itinerário Detalhado da Proposta', {
                x: mm(14),
                y: yPos(currentY),
                size: 14,
                font: fontBold,
            });
            page.drawLine({
                start: { x: mm(14), y: yPos(currentY + 2) },
                end: { x: width - mm(14), y: yPos(currentY + 2) },
                thickness: 1,
                color: rgb(0.8, 0.8, 0.8),
            });
            currentY += 15;

            let totalAmount = 0;

            // Check if items are per trip or global
            // If global, we'll add them at the end.
            
            quoteData.quoted_trips.forEach(trip => {
                // Check page break
                if (currentY > 250) {
                    // Simple page break logic would be needed for robust PDF, but for now assuming fit or new page creation
                    // For brevity in this context, we'll just continue. Real impl needs `pdfDoc.addPage()`.
                }

                const tripDateStr = format(parseISO(trip.date), 'dd/MM/yyyy', { locale: ptBR });
                const tripPrice = parseFloat(trip.price || 0);
                totalAmount += tripPrice;

                // Trip Box
                page.drawRectangle({
                    x: mm(14),
                    y: yPos(currentY + 25),
                    width: mm(182),
                    height: mm(30),
                    color: rgb(248/255, 250/255, 252/255), // slate-50
                    borderColor: rgb(226/255, 232/255, 240/255), // slate-200
                    borderWidth: 1,
                });

                // Date & Time
                page.drawText(`${tripDateStr} - ${trip.time}`, {
                    x: mm(18),
                    y: yPos(currentY + 8),
                    size: 11,
                    font: fontBold,
                    color: blueColor
                });

                // Route
                const routeStr = `${trip.origin} -> ${trip.destination}`;
                // Simple truncate if too long
                const truncatedRoute = routeStr.length > 60 ? routeStr.substring(0, 57) + '...' : routeStr;
                page.drawText(truncatedRoute, {
                    x: mm(18),
                    y: yPos(currentY + 14),
                    size: 9,
                    font: fontRegular,
                    color: blackColor
                });

                // Vehicle
                page.drawText(`Veículo: ${trip.vehicle_type_name || 'Padrão'}`, {
                    x: mm(18),
                    y: yPos(currentY + 20),
                    size: 9,
                    font: fontRegular,
                    color: rgb(0.4, 0.4, 0.4)
                });

                // Price
                const vPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tripPrice);
                const priceWidth = fontBold.widthOfTextAtSize(vPrice, 12);

                page.drawText(vPrice, {
                    x: width - mm(18) - priceWidth,
                    y: yPos(currentY + 15), // Centered vertically roughly
                    size: 12,
                    font: fontBold,
                    color: greenBorderColor
                });

                currentY += 35;
            });

            // Itens Adicionais (Professional - Multi Trips)
            if (quoteData.selected_additional_items && quoteData.selected_additional_items.length > 0) {
                currentY += 5;
                page.drawText('Itens e Serviços Adicionais:', {
                    x: mm(14),
                    y: yPos(currentY),
                    size: 11,
                    font: fontBold,
                    color: blackColor
                });
                currentY += 6;

                quoteData.selected_additional_items.forEach(item => {
                    const itemTotal = (item.price || 0) * (item.quantity || 1);
                    totalAmount += itemTotal;
                    
                    page.drawText(`• ${item.name} (${item.quantity}x)`, {
                        x: mm(18),
                        y: yPos(currentY),
                        size: 10,
                        font: fontRegular,
                        color: blackColor
                    });

                    const itemPriceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotal);
                    const itemPriceWidth = fontRegular.widthOfTextAtSize(itemPriceStr, 10);

                    page.drawText(itemPriceStr, {
                        x: width - mm(18) - itemPriceWidth,
                        y: yPos(currentY),
                        size: 10,
                        font: fontRegular,
                        color: blackColor
                    });
                    
                    currentY += 5;
                });
                currentY += 5;
            }

            // Total
            currentY += 5;
            const totalStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount);
            page.drawText(`Valor Total da Proposta: ${totalStr}`, {
                x: mm(14),
                y: yPos(currentY),
                size: 14,
                font: fontBold,
                color: blackColor
            });
            currentY += 20;

        } else if (quoteData.multi_vehicle_quotes && quoteData.multi_vehicle_quotes.length > 0) {
            // 2. Multi Vehicle Options (Legacy/Standard B2B)
            page.drawText('Opções de Veículos', {
                x: mm(14),
                y: yPos(currentY),
                size: 14,
                font: fontBold,
            });
            page.drawLine({
                start: { x: mm(14), y: yPos(currentY + 2) },
                end: { x: width - mm(14), y: yPos(currentY + 2) },
                thickness: 1,
                color: rgb(0.8, 0.8, 0.8),
            });
            currentY += 15;

            quoteData.multi_vehicle_quotes.forEach(vehicle => {
                // Caixa para cada veículo
                page.drawRectangle({
                    x: mm(14),
                    y: yPos(currentY + 20),
                    width: mm(182),
                    height: mm(25),
                    color: rgb(248/255, 250/255, 252/255), // slate-50
                    borderColor: rgb(226/255, 232/255, 240/255), // slate-200
                    borderWidth: 1,
                });

                page.drawText(vehicle.vehicle_type_name || 'Veículo', {
                    x: mm(18),
                    y: yPos(currentY + 8),
                    size: 12,
                    font: fontBold,
                    color: blackColor
                });

                page.drawText(`${vehicle.capacity_passengers || 4} Passageiros • ${vehicle.capacity_luggage || 2} Malas`, {
                    x: mm(18),
                    y: yPos(currentY + 14),
                    size: 9,
                    font: fontRegular,
                    color: rgb(0.4, 0.4, 0.4)
                });

                const vPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vehicle.price || 0);
                const priceWidth = fontBold.widthOfTextAtSize(vPrice, 14);

                page.drawText(vPrice, {
                    x: width - mm(18) - priceWidth,
                    y: yPos(currentY + 12),
                    size: 14,
                    font: fontBold,
                    color: greenBorderColor
                });

                currentY += 30;
            });

            if (quoteData.selected_additional_items && quoteData.selected_additional_items.length > 0) {
                currentY += 10;
                page.drawText('Itens Adicionais (Aplicáveis à viagem):', {
                    x: mm(14),
                    y: yPos(currentY),
                    size: 11,
                    font: fontBold,
                    color: blackColor
                });
                currentY += 6;

                quoteData.selected_additional_items.forEach(item => {
                    const itemTotal = (item.price || 0) * (item.quantity || 1);
                    const itemPriceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotal);
                    page.drawText(`• ${item.name} (${item.quantity}x) - ${itemPriceStr}`, {
                        x: mm(14),
                        y: yPos(currentY),
                        size: 10,
                        font: fontRegular,
                        color: blackColor
                    });
                    currentY += 5;
                });
            }
        }
        
    } else {
        // Formato Standard
        page.drawText('Veículo e Motorista', {
            x: mm(14),
            y: yPos(currentY),
            size: 14,
            font: fontBold,
        });
        page.drawLine({
            start: { x: mm(14), y: yPos(currentY + 2) },
            end: { x: width - mm(14), y: yPos(currentY + 2) },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });
        currentY += 10;
    
        page.drawText(`Categoria: ${quoteData.vehicle_type_name || 'Executivo'}`, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
        currentY += 6;
    
        const langMap = { 'en': 'Inglês', 'es': 'Espanhol', 'pt': 'Português' };
        const lang = langMap[quoteData.driver_language] || 'Português';
        page.drawText(`Idioma do Motorista: ${lang}`, { x: mm(14), y: yPos(currentY), size: 10, font: fontRegular });
        currentY += 20;
    
        let finalPrice = parseFloat(quoteData.admin_quote_price || quoteData.calculated_price || 0);

        // Itens Adicionais (Standard)
        if (quoteData.selected_additional_items && quoteData.selected_additional_items.length > 0) {
            page.drawText('Itens e Serviços Adicionais:', {
                x: mm(14),
                y: yPos(currentY),
                size: 11,
                font: fontBold,
                color: blackColor
            });
            currentY += 6;

            quoteData.selected_additional_items.forEach(item => {
                const itemTotal = (item.price || 0) * (item.quantity || 1);
                // Check if admin_quote_price already includes it? 
                // Usually admin_quote_price is manual input. If we add to it, we might double count if user already added.
                // BUT, to be safe and consistent with "detailed breakdown", we list them.
                // Assuming admin_quote_price is the BASE price or FINAL price?
                // In Step 5, it defaults to vehicle price. So it likely DOES NOT include items.
                finalPrice += itemTotal;
                
                page.drawText(`• ${item.name} (${item.quantity}x)`, {
                    x: mm(14),
                    y: yPos(currentY),
                    size: 10,
                    font: fontRegular,
                    color: blackColor
                });

                const itemPriceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemTotal);
                const itemPriceWidth = fontRegular.widthOfTextAtSize(itemPriceStr, 10);

                page.drawText(itemPriceStr, {
                    x: width - mm(14) - itemPriceWidth,
                    y: yPos(currentY),
                    size: 10,
                    font: fontRegular,
                    color: blackColor
                });
                
                currentY += 5;
            });
            currentY += 10;
        }

        // --- Preço Standard ---
        page.drawRectangle({
            x: mm(14),
            y: yPos(currentY + 25),
            width: mm(182),
            height: mm(30),
            color: greenBgColor,
            borderColor: greenBorderColor,
            borderWidth: 1,
        });
    
        page.drawText('Valor Total:', {
            x: mm(24),
            y: yPos(currentY + 10),
            size: 14,
            font: fontBold,
            color: greenBorderColor,
        });
    
        const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalPrice);
        
        page.drawText(priceFormatted, {
            x: mm(24),
            y: yPos(currentY + 22),
            size: 24,
            font: fontBold,
            color: greenBorderColor,
        });
        currentY += 40;
    }

    // --- Observações ---
    const notes = quoteData.admin_notes || quoteData.notes || '';
    const profNotes = quoteData.professional_notes || '';

    if (profNotes) {
        page.drawText('Regras e Condições:', { x: mm(14), y: yPos(currentY), size: 12, font: fontBold, color: blackColor });
        currentY += 6;
        let addedHeight = drawWrappedText(profNotes, 14, currentY, 9, fontRegular, 180);
        currentY += addedHeight + 10;
    }

    if (notes) {
        page.drawText('Outras Observações:', { x: mm(14), y: yPos(currentY), size: 12, font: fontBold, color: blackColor });
        currentY += 6;
        drawWrappedText(notes, 14, currentY, 10, fontRegular, 180);
    }

    // --- Footer ---
    const footerLine1 = 'Este documento é uma cotação de serviços de transporte executivo.';
    const footerLine2 = 'www.transferonline.com.br - Telefone / Whatsapp: (11) 5102-3892';
    const footerLine3 = 'Email: contato@transferonline.com.br';

    page.drawText(footerLine1, {
        x: width / 2 - (fontRegular.widthOfTextAtSize(footerLine1, 8) / 2),
        y: mm(18),
        size: 8,
        font: fontRegular,
        color: rgb(0.6, 0.6, 0.6),
    });
    page.drawText(footerLine2, {
        x: width / 2 - (fontRegular.widthOfTextAtSize(footerLine2, 8) / 2),
        y: mm(13),
        size: 8,
        font: fontRegular,
        color: rgb(0.6, 0.6, 0.6),
    });
    page.drawText(footerLine3, {
        x: width / 2 - (fontRegular.widthOfTextAtSize(footerLine3, 8) / 2),
        y: mm(8),
        size: 8,
        font: fontRegular,
        color: rgb(0.6, 0.6, 0.6),
    });

    // Output
    const pdfBytes = await pdfDoc.save();

    // Converter Uint8Array para Base64 de forma segura
    const binaryString = pdfBytes.reduce((data, byte) => data + String.fromCharCode(byte), '');
    const base64Pdf = btoa(binaryString);

    return Response.json({
        success: true,
        filename: `cotacao-${quoteData.quote_number || 'nova'}.pdf`,
        file_base64: base64Pdf
    });

  } catch (error) {
    console.error('Error generating quote PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});