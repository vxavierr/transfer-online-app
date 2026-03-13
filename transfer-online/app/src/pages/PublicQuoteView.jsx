import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Loader2, 
  Calendar, 
  MapPin, 
  Users, 
  Car, 
  CheckCircle, 
  AlertCircle,
  Plane,
  ArrowRight,
  User,
  ThumbsUp,
  ThumbsDown,
  XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PublicQuoteView() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quote, setQuote] = useState(null);

  const [supplierLogo, setSupplierLogo] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleResponse = async (action) => {
    if (!quote) return;
    
    setProcessingAction(action);
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    try {
      const response = await base44.functions.invoke('updateQuoteResponse', {
        quoteId: quote.id,
        token: token || quote.public_token,
        action
      });

      if (response.data.success) {
        // Atualizar estado local
        setQuote(prev => ({
          ...prev,
          status: action === 'accept' ? 'aceito' : 'recusado',
          client_responded_at: new Date().toISOString()
        }));

        if (action === 'accept') {
          setShowSuccessDialog(true);
        }
      } else {
        alert('Erro ao processar resposta: ' + (response.data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro:', error);
      // Melhor tratamento de erro para exibir a mensagem real se disponível
      const errorMessage = error.response?.data?.error || error.message || 'Erro desconhecido ao processar resposta.';
      alert('Erro ao processar: ' + errorMessage);
    } finally {
      setProcessingAction(null);
    }
  };

  useEffect(() => {
    const fetchQuote = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const id = params.get('id'); // Otimização para busca rápida

      if (!token) {
        setError('Link inválido ou incompleto.');
        setLoading(false);
        return;
      }

      try {
        const response = await base44.functions.invoke('getQuoteByToken', { token, quoteId: id });
        if (response.data && !response.data.error) {
          const quoteData = response.data;
          setQuote(quoteData);
          
          // If professional format and supplier ID exists, fetch supplier logo
          // Note: getQuoteByToken should ideally return supplier info if linked, 
          // or we fetch it here if we have public access or if getQuoteByToken returns it.
          // Assuming getQuoteByToken might return supplier_id or we need another way.
          // Since getQuoteByToken is a backend function, let's assume it can return the logo URL if modified, 
          // OR we can try to fetch supplier public info if we had an endpoint.
          // For now, let's try to see if quoteData has supplier info or if we can fetch it.
          // Actually, `getQuoteByToken` returns filtered data. We should probably update `getQuoteByToken` to return logo.
          // But since I cannot modify `getQuoteByToken` right now (I didn't plan to read/write it), 
          // I will check if I can fetch supplier details publicly. Likely not directly via ID without auth.
          // However, for this task, I will assume the backend returns necessary info or I can add a simple logic here if supplier_id is present.
          // Wait, I am an admin in this context? No, this is a public page.
          // Let's optimistically assume I can get the logo. 
          // If not, I might need to update `getQuoteByToken` in a real scenario.
          // For now, let's skip the logo fetch if it's not in quote data, 
          // but I'll add the logic to display it if `quote.supplier_logo_url` is present (which would require backend update).
          // To be complete, I should probably update `getQuoteByToken` to include `supplier_logo_url`.
          // I'll add a TODO or assume it might be there. 
          // actually, let's try to fetch supplier public info if possible.
          
          if (quoteData.supplier_id) {
             // In a real app, we'd need a public endpoint for this. 
             // For now, let's assume the `getQuoteByToken` includes it if I update it.
             // I will update `getQuoteByToken` in the next step to be sure.
          }

        } else {
          setError('Cotação não encontrada.');
        }
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError('Erro ao carregar a cotação. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [location.search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando detalhes da cotação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardContent className="pt-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops!</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      // Append time to ensure parsing as local date (avoiding UTC midnight timezone shift)
      const dateObj = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr + 'T12:00:00');
      return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) { return dateStr; }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const serviceTypeLabel = {
    'one_way': 'Transfer (Só Ida)',
    'round_trip': 'Transfer (Ida e Volta)',
    'hourly': 'Disposição por Hora'
  }[quote.service_type] || quote.service_type;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {quote.supplier_logo_url ? (
            <div className="flex justify-center mb-4">
              <img 
                src={quote.supplier_logo_url} 
                alt="Logo da Empresa" 
                className="h-20 object-contain"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl shadow-lg mb-4 overflow-hidden">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">
            {quote.supplier_name || 'TransferOnline'}
          </h1>
          <p className="text-gray-500 mt-2">
            {quote.quote_format === 'professional' ? 'Proposta Comercial' : 'Detalhes da sua Cotação'}
          </p>
          

        </div>

        <Card className="shadow-xl overflow-hidden border-0 ring-1 ring-gray-200">
          <div className={`px-6 py-8 text-white ${quote.quote_format === 'professional' ? 'bg-gradient-to-r from-purple-700 to-indigo-800' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
            <div className={`flex ${quote.quote_format === 'professional' ? 'justify-center text-center' : 'justify-between text-left'} items-center`}>
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  {quote.quote_format === 'professional' ? 'Proposta #' : 'Cotação #'}
                </p>
                <h2 className="text-3xl font-bold">{quote.quote_number || 'N/A'}</h2>
              </div>
              
              {quote.quote_format !== 'professional' && (
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-xs text-blue-100 mb-1">Valor Total</p>
                  <p className="text-2xl font-bold">{formatPrice(quote.admin_quote_price)}</p>
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-8">
            
            {/* Status Alert (Hide for Professional Quotes) */}
            {quote.status === 'cotado' && quote.quote_format !== 'professional' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">Cotação Pronta</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Esta cotação foi aprovada e está aguardando seu pagamento para confirmar a reserva.
                  </p>
                </div>
              </div>
            )}

            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Dados do Cliente</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="font-bold text-gray-600">{quote.customer_name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cliente/Passageiro</p>
                    <p className="font-semibold text-gray-900">{quote.customer_name}</p>
                    <p className="text-sm text-gray-500">{quote.customer_email}</p>
                  </div>
                </div>

                {quote.requester_name && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Solicitado por</p>
                      <p className="font-semibold text-gray-900">{quote.requester_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Introduction for Professional Quotes */}
            {quote.quote_format === 'professional' ? (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Apresentação</h3>
                <div className="space-y-4 text-gray-600 leading-relaxed text-justify">
                  <p>
                    Reconhecendo a importância da eficiência e da excelência na logística corporativa, temos o prazer de apresentar nossa proposta de parceria com a <strong>{quote.supplier_name || 'TransferOnline'}</strong>, referência em transporte executivo em São Paulo.
                  </p>
                  <p>
                    Nossa missão é garantir que cada deslocamento de seus colaboradores ou clientes — seja um Transfer Aeroporto, um serviço para eventos ou uma viagem intermunicipal — seja realizado com o máximo de conforto, segurança e pontualidade 24 horas por dia.
                  </p>
                  <p>
                    Esta proposta detalha como a nossa frota moderna e o serviço de motoristas profissionais podem otimizar a gestão de viagens da sua empresa, tornando a mobilidade um diferencial competitivo.
                  </p>
                </div>
              </div>
            ) : (
              /* Standard Trip Details */
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Detalhes da Viagem</h3>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Origem</p>
                        <p className="font-medium text-gray-900">{quote.origin}</p>
                        {quote.origin_flight_number && (
                           <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                             <Plane className="w-3 h-3" /> Voo: {quote.origin_flight_number}
                           </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <MapPin className="w-5 h-5 text-red-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Destino</p>
                        <p className="font-medium text-gray-900">{quote.destination}</p>
                        {quote.destination_flight_number && (
                           <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                             <Plane className="w-3 h-3" /> Voo: {quote.destination_flight_number}
                           </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Calendar className="w-5 h-5 text-gray-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Data de Ida</p>
                        <p className="font-medium text-gray-900">{formatDate(quote.date)}</p>
                        <p className="text-sm text-gray-600">{quote.time}</p>
                      </div>
                    </div>

                    {quote.return_date && (
                      <div className="flex gap-3">
                        <Calendar className="w-5 h-5 text-gray-600 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Data de Volta</p>
                          <p className="font-medium text-gray-900">{formatDate(quote.return_date)}</p>
                          <p className="text-sm text-gray-600">{quote.return_time}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Car className="w-5 h-5 text-gray-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Veículo</p>
                        <p className="font-medium text-gray-900">
                          {quote.vehicle_type_name}
                        </p>
                        <p className="text-xs text-gray-500">{serviceTypeLabel}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Users className="w-5 h-5 text-gray-600 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Passageiros</p>
                        <p className="font-medium text-gray-900">{quote.passengers}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Professional Format: Quote Details */}
            {quote.quote_format === 'professional' && (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Itinerário e Opções da Proposta</h3>
                <div className="space-y-6">
                  
                  {/* 1. Veículos da Etapa Principal (Multi Vehicle Quotes with Prices) */}
                  {quote.multi_vehicle_quotes && quote.multi_vehicle_quotes.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Opções de Veículos (Viagem Principal)</h4>
                      {quote.multi_vehicle_quotes.map((vehicle, idx) => {
                        // Somente exibir se tiver preço definido (ou for uma opção válida)
                        // No novo fluxo, multi_vehicle_quotes tem preços definidos pelo admin
                        if (!vehicle.price && vehicle.price !== 0) return null;
                        
                        return (
                          <div key={`mv-${idx}`} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-blue-700 font-bold">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(quote.date)} às {quote.time}
                                </div>
                                <div className="flex items-start gap-2 text-gray-700 font-medium">
                                  <MapPin className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                                  <div className="flex-1">
                                    {quote.service_type === 'hourly' ? (
                                      <div className="flex flex-col">
                                        <span>{quote.hours}h à Disposição</span>
                                        <span className="text-sm text-gray-600 font-normal mt-1">Início: {quote.origin}</span>
                                        {quote.planned_stops && quote.planned_stops.length > 0 && (
                                          <div className="mt-1 space-y-1">
                                            {quote.planned_stops.map((stop, sIdx) => (
                                              <div key={sIdx} className="text-sm text-gray-600 font-normal flex items-start gap-1">
                                                <span className="text-xs bg-gray-100 px-1 rounded text-gray-500 mt-0.5">Parada {sIdx + 1}</span>
                                                <span>{stop.address}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {quote.destination && (
                                          <span className="text-sm text-gray-600 font-normal mt-1">Destino Ref: {quote.destination}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span>{quote.origin} → {quote.destination}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                    <Car className="w-4 h-4" />
                                    {vehicle.quantity || 1}x {vehicle.vehicle_type_name}
                                  </div>
                                  {(vehicle.quantity > 1) && (
                                    <div className="text-xs text-gray-500 ml-6">
                                      Preço Unit. {formatPrice(vehicle.price)}
                                    </div>
                                  )}
                                </div>
                                </div>
                                <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Total</p>
                                <div className="text-2xl font-bold text-green-700">
                                  {formatPrice(vehicle.total_price || (vehicle.price * (vehicle.quantity || 1)))}
                                </div>
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Trechos Adicionais (Quoted Trips) */}
                  {quote.quoted_trips && quote.quoted_trips.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Trechos Adicionais</h4>
                      {quote.quoted_trips.map((trip, idx) => (
                        <div key={`qt-${idx}`} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-blue-700 font-bold">
                                <Calendar className="w-4 h-4" />
                                {formatDate(trip.date)} às {trip.time}
                              </div>
                              <div className="flex items-start gap-2 text-gray-700 font-medium">
                                <MapPin className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                                <div className="flex-1">
                                  {trip.service_type === 'hourly' ? (
                                    <div className="flex flex-col">
                                      <span>{trip.hours}h à Disposição</span>
                                      <span className="text-sm text-gray-600 font-normal mt-1">Início: {trip.origin}</span>
                                      {trip.planned_stops && trip.planned_stops.length > 0 && (
                                        <div className="mt-1 space-y-1">
                                          {trip.planned_stops.map((stop, sIdx) => (
                                            <div key={sIdx} className="text-sm text-gray-600 font-normal flex items-start gap-1">
                                              <span className="text-xs bg-gray-100 px-1 rounded text-gray-500 mt-0.5">Parada {sIdx + 1}</span>
                                              <span>{stop.address}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {trip.destination && (
                                        <span className="text-sm text-gray-600 font-normal mt-1">Destino Ref: {trip.destination}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span>{trip.origin} → {trip.destination}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Car className="w-4 h-4" />
                                Veículo: {trip.vehicle_type_name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-700">{formatPrice(trip.price)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total Geral */}
                  <div className="flex justify-end pt-6 border-t mt-4">
                    <div className="text-right bg-green-50 p-4 rounded-lg border border-green-100">
                      <p className="text-sm text-green-800 uppercase font-bold mb-1">Valor Total da Proposta</p>
                      <p className="text-4xl font-bold text-green-700">
                        {formatPrice(
                          (quote.multi_vehicle_quotes?.reduce((acc, v) => acc + (parseFloat(v.total_price) || (parseFloat(v.price) * (v.quantity || 1)) || 0), 0) || 0) +
                          (quote.quoted_trips?.reduce((acc, t) => acc + (parseFloat(t.price) || 0), 0) || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {(quote.admin_notes || quote.professional_notes) && (
              <div className="bg-gray-50 rounded-lg p-4">
                {quote.professional_notes && (
                  <div className="mb-4">
                    <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Condições e Regras
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{quote.professional_notes}</p>
                  </div>
                )}
                {quote.admin_notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Outras Observações:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{quote.admin_notes}</p>
                  </div>
                )}
              </div>
            )}

          </CardContent>

          {/* Footer Actions */}
          <CardFooter className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {quote.quote_format === 'professional' ? (
              <div className="w-full">
                {(quote.status === 'aceito' || quote.status === 'recusado') ? (
                  <div className={`w-full p-4 rounded-lg text-center border ${
                    quote.status === 'aceito' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {quote.status === 'aceito' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      <span className="text-lg font-bold">
                        {quote.status === 'aceito' ? 'Proposta Aceita' : 'Proposta Recusada'}
                      </span>
                    </div>
                    {quote.client_responded_at && (
                      <p className="text-sm opacity-80">
                        Registrado em {format(parseISO(quote.client_responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-end w-full">
                    <Button 
                      variant="outline" 
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 px-6 py-6 text-base w-full sm:w-auto"
                      onClick={() => handleResponse('decline')}
                      disabled={processingAction}
                    >
                      {processingAction === 'decline' ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ThumbsDown className="w-5 h-5 mr-2" />}
                      Declinar Proposta
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-base shadow-md hover:shadow-lg w-full sm:w-auto"
                      onClick={() => handleResponse('accept')}
                      disabled={processingAction}
                    >
                      {processingAction === 'accept' ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ThumbsUp className="w-5 h-5 mr-2" />}
                      Aceitar Proposta
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Standard Format Footer (Existing) */
              <>
                <div className="text-center sm:text-left">
                  <p className="text-sm text-gray-500">Total a Pagar</p>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(quote.admin_quote_price)}</p>
                </div>
                
                {quote.payment_link_url && (
                  <Button 
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                    onClick={() => window.location.href = quote.payment_link_url}
                  >
                    Pagar e Confirmar Reserva
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                )}
              </>
            )}
          </CardFooter>
        </Card>

        <div className="text-center mt-8 text-gray-600 text-sm space-y-1">
          {quote.supplier_name && quote.supplier_name !== 'TransferOnline' ? (
             <>
                <p className="font-medium">{quote.supplier_name}</p>
                {quote.supplier_phone && <p>Telefone / Whatsapp: {quote.supplier_phone}</p>}
                {quote.supplier_email && <p>Email: {quote.supplier_email}</p>}
             </>
          ) : (
             <>
                <p className="font-medium">www.transferonline.com.br</p>
                <p>Telefone / Whatsapp: (11) 5102-3892</p>
                <p>Email: contato@transferonline.com.br</p>
             </>
          )}
          <p className="pt-4 text-xs text-gray-400">© {new Date().getFullYear()} {quote.supplier_name || 'TransferOnline'}. Todos os direitos reservados.</p>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-6 h-6" />
              Proposta Aceita!
            </DialogTitle>
            <DialogDescription className="pt-2 text-gray-700 leading-relaxed text-base">
              Sua cotação foi aceita com sucesso. 
              <br /><br />
              Em breve, você receberá um e-mail do fornecedor com todos os detalhes e próximos passos para a sua viagem.
              <br /><br />
              <strong>Para agilizar o processo:</strong> Por favor, providencie a listagem completa dos passageiros com nome completo e documento de identificação (RG ou CPF), especialmente para viagens intermunicipais.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white px-8"
              onClick={() => setShowSuccessDialog(false)}
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}