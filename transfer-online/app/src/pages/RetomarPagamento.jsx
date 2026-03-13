import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, CreditCard, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function PaymentForm({ booking, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message);
        setIsProcessing(false);
        onError(error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await base44.entities.Booking.update(booking.id, {
          payment_status: 'pago',
          status: 'confirmada',
          payment_intent_id: paymentIntent.id
        });
        setIsProcessing(false);
        onSuccess();
      }
    } catch (err) {
      console.error("Erro ao confirmar pagamento:", err);
      setErrorMessage('Erro ao processar pagamento. Tente novamente.');
      setIsProcessing(false);
      onError(err.message);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-xl mb-6">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900 text-lg">Total a Pagar:</span>
          <span className="text-3xl font-bold text-blue-600">
            {formatPrice(booking.total_price)}
          </span>
        </div>
      </div>

      <PaymentElement />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processando Pagamento...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Confirmar Pagamento
          </>
        )}
      </Button>
    </form>
  );
}

export default function RetomarPagamento() {
  const [booking, setBooking] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    const initStripe = async () => {
      try {
        const response = await base44.functions.invoke('getPublicConfig');
        const key = response.data?.stripePublishableKey;
        if (key) {
          setStripePromise(loadStripe(key));
        }
      } catch (err) {
        console.error('Failed to load Stripe key', err);
      }
    };
    initStripe();
  }, []);

  useEffect(() => {
    const loadBooking = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const bookingId = urlParams.get('bookingId');
      const secret = urlParams.get('clientSecret');

      if (!bookingId || !secret) {
        setError('Link de pagamento inválido. Verifique o link recebido por e-mail.');
        setIsLoading(false);
        return;
      }

      try {
        const bookings = await base44.entities.Booking.list();
        const foundBooking = bookings.find(b => b.id === bookingId);

        if (!foundBooking) {
          setError('Reserva não encontrada.');
          setIsLoading(false);
          return;
        }

        if (foundBooking.payment_status === 'pago') {
          setError('Esta reserva já foi paga.');
          setIsLoading(false);
          return;
        }

        setBooking(foundBooking);
        setClientSecret(secret);
        setIsLoading(false);
      } catch (err) {
        console.error('Erro ao carregar reserva:', err);
        setError('Erro ao carregar informações da reserva. Tente novamente.');
        setIsLoading(false);
      }
    };

    loadBooking();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      await base44.functions.invoke('sendBookingEmail', {
        bookingId: booking.id,
        recipientType: 'customer',
        emailType: 'confirmation'
      });

      await base44.functions.invoke('sendBookingEmail', {
        bookingId: booking.id,
        recipientType: 'admin',
        emailType: 'new_booking_notification'
      });
    } catch (emailError) {
      console.error('Erro ao enviar e-mails:', emailError);
    }

    setPaymentCompleted(true);
  };

  const handlePaymentError = (error) => {
    console.error('Erro no pagamento:', error);
    setError(error);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Carregando informações da reserva...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
            <CardTitle className="text-2xl flex items-center gap-3">
              <AlertCircle className="w-8 h-8" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Link to={createPageUrl('NovaReserva')}>
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Nova Reserva
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <CheckCircle className="w-14 h-14 text-white animate-bounce" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Pagamento Confirmado!
          </h2>
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            Sua reserva foi confirmada e o pagamento processado com sucesso.
            {booking.booking_number && (
              <>
                <br />
                <span className="font-bold text-2xl text-green-600 block mt-3">
                  #{booking.booking_number}
                </span>
              </>
            )}
            <br />
            <span className="text-sm">Você receberá um e-mail com todos os detalhes.</span>
          </p>
          <Link to={createPageUrl('NovaReserva')}>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full py-6 text-lg font-bold rounded-2xl shadow-xl">
              Fazer Nova Reserva
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Link to={createPageUrl('NovaReserva')} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Finalize sua Reserva
          </h1>
          <p className="text-xl text-gray-600">
            Complete o pagamento para confirmar seu transfer
          </p>
        </div>

        {/* Resumo da Reserva */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <CardTitle className="text-2xl">
              Reserva {booking.booking_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Origem</div>
                <div className="font-semibold text-gray-900">{booking.origin}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Destino</div>
                <div className="font-semibold text-gray-900">{booking.destination}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Data</div>
                <div className="font-semibold text-gray-900">
                  {format(new Date(booking.date), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Horário</div>
                <div className="font-semibold text-gray-900">{booking.time}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Passageiros</div>
                <div className="font-semibold text-gray-900">{booking.passengers}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Veículo</div>
                <div className="font-semibold text-gray-900">{booking.vehicle_type_name}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Pagamento */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
            <CardTitle className="text-2xl">Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#2563eb',
                    }
                  },
                  locale: 'pt-BR'
                }}
              >
                <PaymentForm
                  booking={booking}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}