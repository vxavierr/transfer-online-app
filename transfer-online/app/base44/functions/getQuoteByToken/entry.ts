import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, quoteId } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    let quote = null;

    // Otimização: Se o ID for fornecido, busca direta (muito mais rápido)
    if (quoteId) {
      try {
        const quoteById = await base44.asServiceRole.entities.QuoteRequest.get(quoteId);
        // Valida se o token corresponde para segurança
        if (quoteById && quoteById.public_token === token) {
          quote = quoteById;
        }
      } catch (e) {
        console.log('Quote ID not found or error:', e);
      }
    }

    // Fallback: Se não achou por ID (ou não foi fornecido), busca por token (pode ser lento sem índice)
    if (!quote) {
      // Usar limit 1 para tentar otimizar a busca
      const quotes = await base44.asServiceRole.entities.QuoteRequest.filter({ 
        public_token: token 
      }, undefined, 1);

      if (quotes && quotes.length > 0) {
        quote = quotes[0];
      }
    }

    if (!quote) {
      return Response.json({ error: 'Cotação não encontrada ou link inválido' }, { status: 404 });
    }

    // Fetch supplier details if available
    let supplierLogoUrl = null;
    let supplierName = null;
    let supplierEmail = null;
    let supplierPhone = null;
    
    if (quote.supplier_id) {
      try {
        const supplier = await base44.asServiceRole.entities.Supplier.get(quote.supplier_id);
        if (supplier) {
          supplierLogoUrl = supplier.branding_logo_url || supplier.logo_url;
          supplierName = supplier.branding_company_name || supplier.company_name || supplier.name;
          supplierEmail = supplier.branding_email || supplier.email;
          supplierPhone = supplier.branding_phone || supplier.phone_number;
        }
      } catch (e) {
        console.error('Error fetching supplier for quote token:', e);
      }
    }

    // Retornar apenas os dados necessários para a visualização pública
    // Filtrar dados sensíveis internos se houver
    const publicData = {
      id: quote.id,
      quote_number: quote.quote_number,
      quote_format: quote.quote_format, // Include format
      service_type: quote.service_type,
      vehicle_type_name: quote.vehicle_type_name,
      multi_vehicle_quotes: quote.multi_vehicle_quotes, // Include multi-vehicle data
      quoted_trips: quote.quoted_trips, // Include multiple trips data
      driver_language: quote.driver_language,
      origin: quote.origin,
      destination: quote.destination,
      date: quote.date,
      time: quote.time,
      return_date: quote.return_date,
      return_time: quote.return_time,
      hours: quote.hours,
      passengers: quote.passengers,
      requester_name: quote.requester_name, // Include requester name
      customer_name: quote.customer_name,
      customer_email: quote.customer_email, // Pode ser útil para confirmação
      admin_quote_price: quote.admin_quote_price,
      admin_notes: quote.admin_notes,
      professional_notes: quote.professional_notes, // Include notes
      payment_link_url: quote.payment_link_url,
      status: quote.status,
      origin_flight_number: quote.origin_flight_number,
      destination_flight_number: quote.destination_flight_number,
      supplier_logo_url: supplierLogoUrl, // Include logo
      supplier_name: supplierName, // Include supplier name
      supplier_email: supplierEmail,
      supplier_phone: supplierPhone
    };

    return Response.json(publicData);

  } catch (error) {
    console.error('Error getting quote by token:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});