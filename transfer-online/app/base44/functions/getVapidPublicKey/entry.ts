import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve((req) => {
  try {
    // Apenas retorna a chave pública, sem lógica async complexa
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    
    if (!publicKey) {
      return Response.json({ 
        error: 'VAPID_PUBLIC_KEY não configurada no backend' 
      }, { status: 500 });
    }

    return Response.json({ publicKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});