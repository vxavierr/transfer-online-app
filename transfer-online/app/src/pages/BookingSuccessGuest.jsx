import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

export default function BookingSuccessGuest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [bookingDetails, setBookingDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('ID da sessão não encontrado.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await base44.functions.invoke('handleGuestStripeCheckoutSuccess', {
          session_id: sessionId
        });

        if (response.data.success) {
          setBookingDetails(response.data.booking);
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(response.data.error || 'Erro ao confirmar pagamento.');
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        setStatus('error');
        setErrorMessage('Erro de conexão ao verificar pagamento.');
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Confirmando seu pagamento...</h2>
          <p className="text-gray-500 mt-2">Por favor, aguarde um momento.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado.</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <Button 
              onClick={() => navigate(createPageUrl('NovaReserva'))}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Voltar para Reserva
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 p-4 flex items-center justify-center">
      <Card className="max-w-lg w-full shadow-xl border-green-100">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-green-700">Reserva Confirmada!</CardTitle>
          <p className="text-gray-600 mt-2">Seu pagamento foi processado com sucesso.</p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-center text-gray-500 mb-1">Número da Reserva</p>
            <p className="text-3xl font-mono font-bold text-center text-blue-600 tracking-wider">
              {bookingDetails?.booking_number}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Origem</p>
                <p className="text-sm text-gray-900">{bookingDetails?.origin}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Destino</p>
                <p className="text-sm text-gray-900">{bookingDetails?.destination}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Data e Hora</p>
                <p className="text-sm text-gray-900">
                  {bookingDetails?.date && format(parseISO(bookingDetails.date), 'dd/MM/yyyy', { locale: ptBR })} às {bookingDetails?.time}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-800">
              Enviamos os detalhes da confirmação para:
              <br />
              <strong>{bookingDetails?.customer_email}</strong>
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button 
              onClick={() => navigate(createPageUrl('NovaReserva'))}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12"
            >
              Fazer Nova Reserva
            </Button>
            
            {/* Future: Add "Complete Registration" button here */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}