import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { quoteId, price, adminNotes } = body;

    if (!quoteId || !price || price <= 0) {
      return Response.json(
        { error: 'ID da cotação e preço válido são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar cotação
    const quoteRequests = await base44.asServiceRole.entities.QuoteRequest.list();
    const quoteRequest = quoteRequests.find(q => q.id === quoteId);

    if (!quoteRequest) {
      return Response.json(
        { error: 'Cotação não encontrada' },
        { status: 404 }
      );
    }

    // Obter a URL base do aplicativo
    const baseUrl = Deno.env.get('BASE_URL') || 'https://transfer-online-booking-f3f66b8f.base44.app';

    // Criar Payment Link no Stripe
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Transfer - Cotação ${quoteRequest.quote_number}`,
              description: `${quoteRequest.origin} → ${quoteRequest.destination}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        quote_request_id: quoteRequest.id,
        quote_number: quoteRequest.quote_number,
        customer_email: quoteRequest.customer_email,
        customer_name: quoteRequest.customer_name,
        type: 'quote_payment'
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/?payment_success=true&quote=${quoteRequest.quote_number}`,
        },
      },
    });

    // Atualizar cotação com preço e link
    await base44.asServiceRole.entities.QuoteRequest.update(quoteId, {
      admin_quote_price: price,
      admin_notes: adminNotes || '',
      status: 'cotado',
      quoted_at: new Date().toISOString(),
      payment_link_url: paymentLink.url,
      payment_link_id: paymentLink.id
    });

    // Enviar e-mail para o cliente
    try {
      await base44.asServiceRole.functions.invoke('sendQuoteResponseEmail', {
        quoteRequestId: quoteId
      });
    } catch (emailError) {
      console.error('Erro ao enviar e-mail:', emailError);
    }

    return Response.json({
      success: true,
      payment_link_url: paymentLink.url,
      payment_link_id: paymentLink.id
    });

  } catch (error) {
    console.error('Erro ao criar payment link:', error);
    return Response.json(
      { error: error.message || 'Erro ao criar link de pagamento' },
      { status: 500 }
    );
  }
});