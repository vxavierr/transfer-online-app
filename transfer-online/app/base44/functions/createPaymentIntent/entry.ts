import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação (opcional para este caso, pois é um endpoint público de reserva)
    // mas é bom verificar para evitar abusos
    const body = await req.json();
    
    const { amount, currency, metadata } = body;

    if (!amount || amount <= 0) {
      return Response.json(
        { error: 'Valor inválido' },
        { status: 400 }
      );
    }

    // Criar PaymentIntent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centavos
      currency: currency || 'brl',
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Erro ao criar PaymentIntent:', error);
    return Response.json(
      { error: error.message || 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
});