import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, mode = 'payment', successUrl, cancelUrl, metadata = {} } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'Missing priceId' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: successUrl || `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/payment-cancel`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        ...metadata,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});