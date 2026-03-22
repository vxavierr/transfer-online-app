import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@^16.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
    }

    const { serviceRequestId } = await req.json();
    console.log(`[PaymentLink] Generating for ID: ${serviceRequestId}`);

    if (!serviceRequestId) {
        return new Response(JSON.stringify({ error: 'Missing serviceRequestId' }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

    const serviceRequest = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
    
    if (!serviceRequest) {
        console.error('[PaymentLink] Service Request not found');
        return new Response(JSON.stringify({ error: 'Service Request not found' }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
    }

    const apiKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!apiKey) {
        console.error('[PaymentLink] Stripe API Key missing');
        return new Response(JSON.stringify({ error: 'Stripe API Key not configured' }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
    }

    // Initialize Stripe with explicit fetch client for Deno
    const stripe = new Stripe(apiKey, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2024-12-18.acacia',
    });

    const price = serviceRequest.final_client_price_with_additions || serviceRequest.chosen_client_price;
    console.log(`[PaymentLink] Price: ${price}`);
    
    if (!price || Number(price) <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid price for payment link generation' }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

    const amountInCents = Math.round(Number(price) * 100);

    let routeDescription = `${serviceRequest.origin} -> ${serviceRequest.destination}`;
    
    // Check for planned stops and include them
    if (serviceRequest.planned_stops && serviceRequest.planned_stops.length > 0) {
        const stopsStr = serviceRequest.planned_stops
            .filter(s => s.address) // Ensure address exists
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(s => s.address)
            .join(' -> ');
            
        if (stopsStr) {
            routeDescription = `${serviceRequest.origin} -> ${stopsStr} -> ${serviceRequest.destination}`;
        }
    }

    const productName = `Viagem ${serviceRequest.request_number || 'SR'} - ${routeDescription}`;

    console.log('[PaymentLink] Creating price object...');
    const priceObject = await stripe.prices.create({
        currency: 'brl',
        unit_amount: amountInCents,
        product_data: {
            name: productName.substring(0, 250),
        },
    });

    console.log('[PaymentLink] Creating payment link...');
    let baseUrl = Deno.env.get('BASE_URL') || 'https://app.transferonline.com.br';
    
    // Ensure URL has protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
    }
    // Remove trailing slash if present
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    console.log(`[PaymentLink] Using Base URL: ${baseUrl}`);
    
    const paymentLink = await stripe.paymentLinks.create({
        line_items: [
            {
                price: priceObject.id,
                quantity: 1,
            },
        ],
        after_completion: {
            type: 'redirect',
            redirect: {
                url: `${baseUrl}/BookingSuccessGuest?session_id={CHECKOUT_SESSION_ID}`,
            },
        },
        metadata: {
            service_request_id: serviceRequest.id,
            request_number: serviceRequest.request_number || ''
        }
    });

    console.log(`[PaymentLink] Success: ${paymentLink.url}`);

    await base44.entities.ServiceRequest.update(serviceRequest.id, {
        payment_link: paymentLink.url,
        payment_status: 'pendente',
        billing_method: 'credit_card'
    });

    return new Response(JSON.stringify({ 
        success: true, 
        payment_link: paymentLink.url 
    }), {
        headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[PaymentLink] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});