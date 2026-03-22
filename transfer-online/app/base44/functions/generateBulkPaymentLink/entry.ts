import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@^16.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceRequestIds, recipientEmail } = await req.json();

    if (!serviceRequestIds || !Array.isArray(serviceRequestIds) || serviceRequestIds.length === 0) {
      return Response.json({ error: 'serviceRequestIds array is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Stripe API Key not configured' }, { status: 500 });
    }

    const stripe = new Stripe(apiKey, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2024-12-18.acacia',
    });

    // Fetch all service requests
    const requests = await Promise.all(
      serviceRequestIds.map(id => base44.asServiceRole.entities.ServiceRequest.get(id))
    );

    const validRequests = requests.filter(r => r && (r.final_client_price_with_additions || r.chosen_client_price) > 0);

    if (validRequests.length === 0) {
      return Response.json({ error: 'Nenhuma solicitação válida com preço encontrada.' }, { status: 400 });
    }

    const totalAmount = validRequests.reduce((sum, r) => {
      return sum + Number(r.final_client_price_with_additions || r.chosen_client_price || 0);
    }, 0);

    const amountInCents = Math.round(totalAmount * 100);
    const numbers = validRequests.map(r => r.request_number || r.id).join(', ');
    const productName = `Pagamento Agrupado - ${validRequests.length} viagens (${numbers})`.substring(0, 250);

    const priceObject = await stripe.prices.create({
      currency: 'brl',
      unit_amount: amountInCents,
      product_data: { name: productName },
    });

    let baseUrl = Deno.env.get('BASE_URL') || 'https://app.transferonline.com.br';
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceObject.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${baseUrl}/BookingSuccessGuest?session_id={CHECKOUT_SESSION_ID}` },
      },
      metadata: {
        bulk_payment: 'true',
        service_request_ids: serviceRequestIds.join(','),
        request_numbers: numbers,
      },
    });

    // Update all valid service requests with the same payment link
    await Promise.all(
      validRequests.map(r =>
        base44.asServiceRole.entities.ServiceRequest.update(r.id, {
          payment_link: paymentLink.url,
          payment_status: 'pendente',
          billing_method: 'credit_card',
        })
      )
    );

    console.log(`[BulkPaymentLink] Created link for ${validRequests.length} requests: ${paymentLink.url}`);

    return Response.json({
      success: true,
      payment_link: paymentLink.url,
      total_amount: totalAmount,
      requests_count: validRequests.length,
    });

  } catch (error) {
    console.error('[BulkPaymentLink] Error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});