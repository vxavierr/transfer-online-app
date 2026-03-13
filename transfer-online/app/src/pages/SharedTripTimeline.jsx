import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, MapPin, User, Car, Phone, Calendar, Clock, 
  CheckCircle2, Circle, AlertCircle, Share2, Copy, Lock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SharedTripTimeline() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTimeline = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setError('Link inválido: token não encontrado.');
        setLoading(false);
        return;
      }

      try {
        const response = await base44.functions.invoke('fetchSharedTimeline', { token });
        
        if (response.data.success) {
          setData(response.data);
        } else {
          setError(response.data.error || 'Erro ao carregar informações da viagem.');
        }
      } catch (err) {
        console.error('Erro ao buscar timeline:', err);
        setError('Erro de conexão ao buscar dados da viagem.');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchTimeline, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Carregando status da viagem...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Não foi possível carregar</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { serviceRequest: trip, statusLogs: rawStatusLogs } = data;

  // Filtrar logs de GPS e remover duplicatas consecutivas
  const statusLogs = (rawStatusLogs || []).filter(log => {
    const note = log.notes ? log.notes.toLowerCase() : '';
    // Termos para excluir (GPS, localização, coordenadas)
    if (note.includes('gps') || 
        note.includes('location') || 
        note.includes('lat:') || 
        note.includes('lon:') || 
        note.includes('atualização automática') ||
        note.includes('rastreamento')) {
      return false;
    }
    return true;
  }).filter((log, index, arr) => {
    // Manter apenas se o status mudou em relação ao log mais recente (anterior na lista ordenada)
    // Isso remove duplicatas consecutivas de status, mantendo o mais recente de cada bloco
    if (index === 0) return true;
    return log.status !== arr[index - 1].status;
  });

  // Função para formatar data/hora em Fuso Horário de São Paulo (Brasília)
  const formatInTimeZone = (dateString, formatStr = "HH:mm") => {
    if (!dateString) return '--:--';
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    
    // Método robusto usando Intl para extrair partes da data no fuso correto
    // e reconstruir um objeto Date "local" que o date-fns possa formatar mantendo os valores visuais
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });

      const parts = formatter.formatToParts(date);
      const getPart = (type) => parts.find(p => p.type === type)?.value;

      const year = parseInt(getPart('year'));
      const month = parseInt(getPart('month')) - 1; // JS months are 0-based
      const day = parseInt(getPart('day'));
      const hour = parseInt(getPart('hour') === '24' ? '0' : getPart('hour')); // Handle 24h edge case if any
      const minute = parseInt(getPart('minute'));
      const second = parseInt(getPart('second'));

      // Cria uma data que "parece" estar no fuso local do navegador com os valores numéricos de SP
      // Isso engana o date-fns para formatar a string corretamente sem fazer conversão de fuso adicional
      const spDate = new Date(year, month, day, hour, minute, second);
      
      return format(spDate, formatStr, { locale: ptBR });
    } catch (e) {
      console.error('Erro ao formatar data com timezone:', e);
      // Fallback para comportamento padrão
      return format(date, formatStr, { locale: ptBR });
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'aguardando': 'Aguardando Motorista',
      'a_caminho': 'Motorista a Caminho',
      'chegou_origem': 'Motorista na Origem',
      'passageiro_embarcou': 'Em Viagem',
      'a_caminho_destino': 'A Caminho do Destino',
      'chegou_destino': 'Chegou ao Destino',
      'finalizada': 'Viagem Finalizada',
      'cancelada': 'Cancelada',
      'cancelada_motorista': 'Cancelada pelo Motorista',
      'no_show': 'Não Compareceu'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'aguardando': 'bg-yellow-100 text-yellow-800',
      'a_caminho': 'bg-blue-100 text-blue-800',
      'chegou_origem': 'bg-purple-100 text-purple-800',
      'passageiro_embarcou': 'bg-indigo-100 text-indigo-800',
      'a_caminho_destino': 'bg-indigo-100 text-indigo-800',
      'chegou_destino': 'bg-green-100 text-green-800',
      'finalizada': 'bg-emerald-100 text-emerald-800',
      'cancelada': 'bg-red-100 text-red-800',
      'no_show': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header com Status */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center p-1 bg-white rounded-full shadow-sm mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg" 
              alt="Logo" 
              className="w-10 h-10 rounded-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acompanhamento de Viagem</h1>
          
          {(trip.passenger_name || trip.customer_name) && (
            <p className="text-lg text-gray-600 font-medium mb-2">
              Passageiro: <span className="text-gray-900">{trip.passenger_name || trip.customer_name}</span>
            </p>
          )}

          <Badge className={`text-sm px-3 py-1 ${getStatusColor(trip.driver_trip_status)}`}>
            {getStatusLabel(trip.driver_trip_status)}
          </Badge>

          {/* ETA - Previsão de Chegada (Apenas se em movimento) */}
          {trip.current_eta_minutes && 
           ['a_caminho', 'passageiro_embarcou', 'a_caminho_destino'].includes(trip.driver_trip_status) && (
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-lg animate-in fade-in slide-in-from-bottom-4">
              <p className="text-sm text-blue-700 font-bold mb-2 flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 animate-pulse" />
                Previsão de Chegada
              </p>
              <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight my-3 text-center">
                {(() => {
                  if (!trip.eta_last_calculated_at) return '--:--';
                  const baseTime = new Date(trip.eta_last_calculated_at).getTime();
                  const arrivalTime = new Date(baseTime + trip.current_eta_minutes * 60000);
                  return formatInTimeZone(arrivalTime, "HH:mm");
                })()}
              </p>
              <p className="text-xs text-blue-600 font-semibold text-center">
                {trip.current_eta_minutes} min restantes
                {trip.eta_last_calculated_at && (
                  <span className="opacity-80 ml-1 block mt-1">
                    Atualizado às {formatInTimeZone(trip.eta_last_calculated_at)}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Card Motorista */}
        {trip.driver_name && (
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {trip.driver_photo_url ? (
                      <img src={trip.driver_photo_url} alt={trip.driver_name} className="w-14 h-14 rounded-full border-2 border-white/30" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-7 h-7 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="text-blue-100 text-xs uppercase font-semibold tracking-wider">Seu Motorista</p>
                      <h3 className="text-xl font-bold">{trip.driver_name}</h3>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    {trip.vehicle_model && (
                      <div className="flex items-center gap-2 text-blue-50">
                        <Car className="w-4 h-4" />
                        <span>{trip.vehicle_model} {trip.vehicle_color && `• ${trip.vehicle_color}`}</span>
                      </div>
                    )}
                    {trip.vehicle_plate && (
                      <div className="flex items-center gap-2 text-blue-50">
                        <div className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">PLACA</div>
                        <span className="font-bold tracking-wide">{trip.vehicle_plate}</span>
                      </div>
                    )}
                    {trip.driver_phone && (
                      <div className="flex items-center gap-2 text-blue-50 sm:col-span-2 pt-1">
                        <Phone className="w-4 h-4" />
                        <span>{trip.driver_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhes da Rota */}
        <Card className="shadow-md border-gray-100">
          <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/50">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Detalhes da Rota
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {trip.date && format(parseISO(trip.date), "dd 'de' MMMM", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {trip.time}
              </div>
            </div>

            <div className="relative pl-4 border-l-2 border-gray-100 space-y-8">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white"></div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Origem</p>
                <p className="text-gray-900 font-medium leading-snug">{trip.origin}</p>
                {trip.origin_flight_number && (
                  <Badge variant="secondary" className="mt-2 text-xs font-normal">
                    Voo: {trip.origin_flight_number}
                  </Badge>
                )}
              </div>

              {trip.planned_stops && trip.planned_stops.map((stop, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-orange-400 ring-4 ring-white"></div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Parada {idx + 1}</p>
                  <p className="text-gray-900 font-medium leading-snug">{stop.address}</p>
                </div>
              ))}

              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 ring-4 ring-white"></div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Destino</p>
                <p className="text-gray-900 font-medium leading-snug">{trip.destination}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linha do Tempo */}
        <Card className="shadow-md border-gray-100">
          <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/50">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Linha do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {statusLogs && statusLogs.length > 0 ? (
              <div className="space-y-6">
                {statusLogs.map((log, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {index === 0 ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-4 h-4" />}
                      </div>
                      {index < statusLogs.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-100 my-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex justify-between items-start">
                        <p className={`font-medium ${index === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                          {getStatusLabel(log.status)}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                          {formatInTimeZone(log.timestamp, "HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatInTimeZone(log.timestamp, "dd/MM/yyyy")}
                      </p>
                      {log.notes && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Nenhuma atualização registrada ainda.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer com Botão de Compartilhar */}
        <div className="text-center pb-8">
          <Button 
            variant="outline" 
            onClick={handleCopyLink}
            className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Link Copiado!' : 'Copiar Link de Acompanhamento'}
          </Button>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-green-600">
              <Lock className="w-3.5 h-3.5" />
              <span className="font-medium">Link seguro e criptografado</span>
            </div>
            <p className="text-xs text-gray-400">
              Atualização automática a cada 30 segundos
              <br />
              © {new Date().getFullYear()} TransferOnline
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}