import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function RetomarCarrinho() {
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processRecovery = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const leadId = urlParams.get('leadId');

      if (!leadId) {
        setError('Link de recuperação inválido.');
        setIsProcessing(false);
        return;
      }

      try {
        const response = await base44.functions.invoke('convertLeadToCheckout', { leadId });
        
        if (response.data?.url) {
          window.location.href = response.data.url;
        } else if (response.data?.paid) {
            setError('Esta reserva já foi paga.');
            setIsProcessing(false);
        } else {
          throw new Error(response.data?.error || 'Erro ao processar recuperação.');
        }
      } catch (err) {
        console.error('Erro na recuperação:', err);
        let msg = 'Não foi possível recuperar o carrinho. Tente novamente ou faça uma nova reserva.';
        
        // Tentar extrair mensagem específica do backend
        if (err.response && err.response.data && err.response.data.error) {
            msg = err.response.data.error;
        } else if (err.message && !err.message.includes('status code')) {
            msg = err.message;
        }
        
        setError(msg);
        setIsProcessing(false);
      }
    };

    processRecovery();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {isProcessing ? (
          <>
            <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Retomando sua reserva...</h2>
              <p className="text-gray-500 mt-2">Você será redirecionado para o pagamento em instantes.</p>
            </div>
          </>
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h2>
            <Alert variant="destructive" className="mb-6 text-left">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.href = createPageUrl('NovaReserva')}
            >
              Fazer Nova Reserva
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}