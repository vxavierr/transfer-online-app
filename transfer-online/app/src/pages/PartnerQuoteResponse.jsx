import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, MapPin, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PartnerQuoteResponse() {
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState(null);
  const [partner, setPartner] = useState(null);
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadQuoteData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const quoteId = urlParams.get('q');
        const token = urlParams.get('t');

        if (!quoteId || !token) {
          setError('Link inválido. Verifique se copiou corretamente o link enviado.');
          setLoading(false);
          return;
        }

        // Buscar cotação
        const quotes = await base44.entities.QuoteRequest.list();
        const foundQuote = quotes.find(q => q.id === quoteId && q.partner_response_token === token);

        if (!foundQuote) {
          setError('Cotação não encontrada ou link expirado.');
          setLoading(false);
          return;
        }

        // Verificar se já foi respondida
        if (foundQuote.partner_status === 'resposta_recebida') {
          setError('Esta cotação já foi respondida anteriormente.');
          setLoading(false);
          return;
        }

        // Buscar dados do parceiro
        const partners = await base44.entities.Subcontractor.list();
        const foundPartner = partners.find(p => p.id === foundQuote.partner_id);

        setQuote(foundQuote);
        setPartner(foundPartner);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar cotação:', err);
        setError('Erro ao carregar dados da cotação. Tente novamente mais tarde.');
        setLoading(false);
      }
    };

    loadQuoteData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cost || parseFloat(cost) <= 0) {
      setError('Por favor, informe um valor válido.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const quoteId = urlParams.get('q');
      const token = urlParams.get('t');

      const response = await base44.functions.invoke('submitPartnerQuoteCost', {
        quoteId,
        token,
        cost: parseFloat(cost)
      });

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Erro ao enviar resposta.');
      }
    } catch (err) {
      console.error('Erro ao enviar custo:', err);
      setError('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando cotação...</p>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Resposta Enviada!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Seu orçamento foi enviado com sucesso! O administrador foi notificado e em breve entrará em contato.
              </AlertDescription>
            </Alert>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Valor informado:</div>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(cost))}
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Você pode fechar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tripType = quote.service_type === 'one_way' ? 'Só Ida' : 
                   quote.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Responder Cotação
          </h1>
          <p className="text-gray-600">Informe o valor do seu serviço para esta viagem</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">
              Olá, {partner?.name}!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-purple-50 p-4 rounded-lg mb-4">
              <div className="text-sm text-gray-600">Cotação:</div>
              <div className="text-2xl font-bold text-purple-600">{quote.quote_number}</div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Rota</div>
                  <div className="font-medium">{quote.origin}</div>
                  <div className="text-gray-500">→ {quote.destination}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Data e Horário</div>
                  <div className="font-medium">{formatDate(quote.date)} às {quote.time}</div>
                  {quote.service_type === 'round_trip' && quote.return_date && (
                    <div className="text-sm text-gray-500 mt-1">
                      Retorno: {formatDate(quote.return_date)} às {quote.return_time}
                    </div>
                  )}
                  {quote.service_type === 'hourly' && quote.hours && (
                    <div className="text-sm text-gray-500 mt-1">
                      Duração: {quote.hours} horas
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Detalhes</div>
                  <div className="font-medium">Tipo: {tripType}</div>
                  <div className="text-sm text-gray-600">Veículo: {quote.vehicle_type_name}</div>
                  <div className="text-sm text-gray-600">Passageiros: {quote.passengers || 1}</div>
                </div>
              </div>

              {quote.notes && (
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-amber-800 mb-1">Observações do Cliente:</div>
                  <div className="text-sm text-amber-900">{quote.notes}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informe seu Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cost">Valor do Serviço (R$) *</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="text-lg"
                  required
                />
                <p className="text-xs text-gray-500">
                  Informe quanto você cobrará para realizar esta viagem
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enviar Orçamento
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>TransferOnline - Sistema de Reservas de Transfer</p>
        </div>
      </div>
    </div>
  );
}