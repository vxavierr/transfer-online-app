import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Car,
  AlertCircle,
  PieChart,
  Activity,
  Plane,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  User,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// Recharts imports removed

// Funções legadas removidas em favor do componente StatusBadge

export default function EventDashboard() {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (!urlToken) {
      setError('Link inválido: token não encontrado');
      setIsLoading(false);
      return;
    }

    setToken(urlToken);
    loadDashboardData(urlToken);

    // Polling para atualização em tempo real a cada 10 segundos
    const intervalId = setInterval(() => {
      loadDashboardData(urlToken, true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const loadDashboardData = async (urlToken, isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    
    try {
      const response = await base44.functions.invoke('getEventClientDashboardByToken', {
        token: urlToken
      });

      if (response.data.success) {
        setData(response.data);
        setLastUpdated(new Date());
      } else {
        if (!isBackground) {
          if (response.data.errorType === 'expired') {
            setError('Este link expirou.');
          } else {
            setError(response.data.error || 'Erro ao carregar dados');
          }
        }
      }
    } catch (err) {
      console.error('[EventDashboard] Erro:', err);
      if (!isBackground) setError('Erro ao carregar dados do evento');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!data?.trips) return null;

    const requests = data.trips;
    const total = requests.length;
    const completed = requests.filter(r => r.receptivity_status === 'efetuada').length;
    const notCompleted = requests.filter(r => r.receptivity_status === 'nao_efetuada').length;
    const pending = requests.filter(r => r.receptivity_status === 'pendente').length;
    
    // Cálculo de passageiros
    let totalPassengers = 0;
    let passengersBoarded = 0;
    let passengersNoShow = 0;
    let passengersPending = 0;

    requests.forEach(r => {
      // Determinar a contagem de passageiros com segurança absoluta
      let paxCount = 1;
      
      if (Array.isArray(r.passengers)) {
        paxCount = r.passengers.length;
      } else if (typeof r.passengers === 'number') {
        paxCount = r.passengers;
      }
      
      // Forçar conversão para número para evitar concatenação de strings/objetos
      paxCount = Number(paxCount) || 0;
      if (paxCount === 0 && !Array.isArray(r.passengers)) paxCount = 1; // Fallback se não for array e der 0
      
      totalPassengers += paxCount;
      
      // Lógica de contagem por status
      let boarded = 0;
      let noshow = 0;
      let pend = 0;

      // Prioridade 1: passenger_receptivity_statuses (formato antigo detalhado)
      if (r.passenger_receptivity_statuses && Array.isArray(r.passenger_receptivity_statuses) && r.passenger_receptivity_statuses.length > 0) {
        boarded = r.passenger_receptivity_statuses.filter(p => p.status === 'arrived').length;
        noshow = r.passenger_receptivity_statuses.filter(p => p.status === 'no_show').length;
        pend = r.passenger_receptivity_statuses.filter(p => p.status === 'pending').length;
      } 
      // Prioridade 2: r.passengers (formato novo unificado)
      else if (Array.isArray(r.passengers) && r.passengers.length > 0 && r.passengers[0].status) {
         boarded = r.passengers.filter(p => p.status === 'arrived').length;
         noshow = r.passengers.filter(p => p.status === 'no_show').length;
         pend = r.passengers.filter(p => p.status === 'pending').length;
      } 
      // Prioridade 3: Status geral da viagem
      else {
        if (r.receptivity_status === 'efetuada') boarded = paxCount;
        else if (r.receptivity_status === 'nao_efetuada') noshow = paxCount;
        else pend = paxCount;
      }

      passengersBoarded += boarded;
      passengersNoShow += noshow;
      passengersPending += pend;
    });

    // Cálculo baseado em passageiros para consistência
    const completionRate = totalPassengers > 0 ? Math.round((passengersBoarded / totalPassengers) * 100) : 0;

    return {
      total,
      completed,
      notCompleted,
      pending,
      completionRate,
      totalPassengers,
      passengersBoarded,
      passengersNoShow,
      passengersPending
    };
  }, [data]);



  const upcomingArrivals = useMemo(() => {
    if (!data?.trips) return [];
    
    const upcoming = [];

    data.trips.forEach(trip => {
      // 1. Verificar Ida (Receptivo)
      if (trip.receptivity_status === 'pendente') {
        upcoming.push({
          ...trip,
          _leg: 'arrival', // Ida
          _sortTime: new Date(`${trip.date}T${trip.time}`).getTime()
        });
      }

      // 2. Verificar Volta (Saída) - Prioridade total se for round_trip
      const hasReturnDate = trip.return_date && trip.return_time;
      const isRoundTrip = trip.service_type === 'round_trip';
      
      if (isRoundTrip || hasReturnDate) {
        // Se for round_trip mas sem data, define uma data futura distante para aparecer no final da lista
        // Se tiver data, usa a data correta
        const returnTime = hasReturnDate 
          ? new Date(`${trip.return_date}T${trip.return_time}`).getTime() 
          : new Date().getTime() + (24 * 60 * 60 * 1000); // Amanhã (fallback)

        const isDepartureFinished = 
             trip.departure_status === 'completed' || 
             trip.departure_trip_status === 'finalizada' || 
             trip.departure_trip_status === 'cancelada_motorista' || 
             trip.departure_trip_status === 'no_show';

        if (!isDepartureFinished) {
          upcoming.push({
            ...trip,
            _leg: 'departure', // Volta
            _sortTime: returnTime,
            _missingDate: !hasReturnDate // Flag para debug visual se necessário
          });
        }
      }
    });

    // Ordenar por horário (misturando idas e voltas)
    return upcoming
      .sort((a, b) => a._sortTime - b._sortTime)
      .slice(0, 5);
  }, [data]);

  const noShows = useMemo(() => {
    if (!data?.trips) return [];
    return data.trips
      .filter(r => r.receptivity_status === 'nao_efetuada')
      .sort((a, b) => new Date(b.receptivity_updated_at) - new Date(a.receptivity_updated_at));
  }, [data]);

  const recentActivity = useMemo(() => {
    if (!data?.trips) return [];

    // Pegar as últimas atualizadas
    return data.trips
      .filter(r => r.receptivity_updated_at)
      .sort((a, b) => new Date(b.receptivity_updated_at) - new Date(a.receptivity_updated_at))
      .slice(0, 5);
  }, [data]);

  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRow = (id) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(expandedRows.filter(rowId => rowId !== id));
    } else {
      setExpandedRows([...expandedRows, id]);
    }
  };

  const allPassengers = useMemo(() => {
    if (!data?.trips) return [];
    const passengers = [];

    data.trips.forEach(request => {
      let tripPassengers = [];

      // Prioridade 1: Status individuais detalhados
      if (request.passenger_receptivity_statuses && request.passenger_receptivity_statuses.length > 0) {
        tripPassengers = request.passenger_receptivity_statuses.map(p => ({
          name: p.name,
          status: p.status // pending, arrived, no_show
        }));
      } 
      // Prioridade 2: Lista de passageiros sem status individual (herda da viagem)
      else if (request.passengers_details && request.passengers_details.length > 0) {
         let status = 'pending';
         if (request.receptivity_status === 'efetuada') status = 'arrived';
         if (request.receptivity_status === 'nao_efetuada') status = 'no_show';

         tripPassengers = request.passengers_details.map(p => ({
           name: p.name,
           status: status
         }));
      } 
      // Prioridade 3: Apenas passageiro principal
      else {
         let status = 'pending';
         if (request.receptivity_status === 'efetuada') status = 'arrived';
         if (request.receptivity_status === 'nao_efetuada') status = 'no_show';
         
         tripPassengers = [{
           name: request.passenger_name,
           status: status
         }];
      }

      tripPassengers.forEach((p, idx) => {
        passengers.push({
          id: `${request.id}_${idx}`,
          tripId: request.id,
          passengerName: p.name,
          status: p.status,
          time: request.time,
          date: request.date,
          origin: request.origin,
          destination: request.destination,
          flight: request.origin_flight_number,
          driver: request.driver_name,
          driverPhone: request.driver_phone,
          vehicle: request.vehicle_model,
          plate: request.vehicle_plate,
          noShowReason: request.receptivity_not_completed_reason,
          isAddedByCoordinator: p.is_added_by_coordinator,
          originalRequest: request
        });
      });
    });

    // Ordenar alfabeticamente por nome do passageiro
    return passengers.sort((a, b) => a.passengerName.localeCompare(b.passengerName));
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-lg">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Indisponível</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              Dashboard do Evento
            </h1>
            <p className="text-slate-600 mt-1">
              Acompanhamento em tempo real • {data?.event?.name || 'Evento'}
            </p>
            {data?.coordinator?.name && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-slate-600 bg-white">
                  Coordenador: {data.coordinator.name}
                </Badge>
              </div>
            )}
          </div>
          <div className="text-right text-xs text-slate-500">
            <div className="flex items-center justify-end gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Atualizado em tempo real
            </div>
            <div>Última atualização: {format(lastUpdated, 'HH:mm:ss')}</div>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-slate-500 uppercase mb-1">Total Previsto</div>
              <div className="text-3xl font-bold text-slate-900">{stats?.totalPassengers}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Car className="w-3 h-3" /> {stats?.total} viagens
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-slate-500 uppercase mb-1">Passageiros Embarcados</div>
              <div className="text-3xl font-bold text-green-700">{stats?.passengersBoarded}</div>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {stats?.completed} viagens efetuadas
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-400 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-slate-500 uppercase mb-1">Passageiros Aguardando</div>
              <div className="text-3xl font-bold text-gray-700">{stats?.passengersPending}</div>
              <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {stats?.pending} viagens pendentes
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-slate-500 uppercase mb-1">Passageiros Ausentes</div>
              <div className="text-3xl font-bold text-red-700">{stats?.passengersNoShow}</div>
              <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {stats?.notCompleted} viagens não efetuadas
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos e Listas */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Progresso Geral */}
          <Card className="md:col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                Status Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-slate-600">Progresso Geral</span>
                <span className="font-bold text-blue-700">{stats?.completionRate}% Concluído</span>
              </div>
              <Progress value={stats?.completionRate} className="h-4 mb-6" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-sm text-slate-600">Pax Pendentes</span>
                  </div>
                  <span className="font-bold text-slate-700">{stats?.passengersPending}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <span className="text-sm text-green-700">Pax Embarcados</span>
                  </div>
                  <span className="font-bold text-green-700">{stats?.passengersBoarded}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                    <span className="text-sm text-red-700">Pax No-Shows</span>
                  </div>
                  <span className="font-bold text-red-700">{stats?.passengersNoShow}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Próximas Chegadas */}
          <Card className="md:col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Próximos Embarques & Retornos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingArrivals.length > 0 ? (
                <div className="space-y-4">
                  {upcomingArrivals.map((trip, idx) => {
                    const isDeparture = trip._leg === 'departure';
                    
                    // Fallback visual se a data não existir mas a trip foi forçada a aparecer
                    const displayTime = isDeparture ? (trip.return_time || '--:--') : trip.time;
                    const displayDate = isDeparture ? (trip.return_date || '') : trip.date;
                    
                    const time = displayTime;
                    const date = displayDate;
                    const flight = isDeparture ? trip.return_destination_flight_number : trip.origin_flight_number;
                    const origin = isDeparture ? (trip.destination || 'Origem não definida') : trip.origin;
                    
                    // Status específico da perna
                    const statusKey = isDeparture ? 'departure_trip_status' : 'receptivity_trip_status';
                    const tripStatus = trip[statusKey];

                    return (
                      <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                        <div className="flex flex-col items-center gap-1">
                          <div className="bg-orange-100 text-orange-700 font-bold rounded px-2 py-1 text-xs min-w-[50px] text-center">
                            {time}
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-1 h-4 ${isDeparture ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {isDeparture ? 'VOLTA' : 'IDA'}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{trip.passenger_name}</div>
                          <div className="text-xs text-slate-500 mb-0.5">
                             {date ? format(parseISO(date), 'dd/MM') : 'Data a definir'}
                          </div>
                          {flight && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Plane className="w-3 h-3" /> Voo: {flight}
                            </div>
                          )}
                          
                          {/* Exibir Status da Viagem */}
                          {tripStatus && tripStatus !== 'aguardando' && (
                            <div className="mt-1">
                              <StatusBadge status={tripStatus} type="trip" className="text-[10px] h-5" />
                            </div>
                          )}
                          
                          {/* Exibir ETA com destaque */}
                          {trip.current_eta_minutes && ['a_caminho', 'passageiro_embarcou', 'a_caminho_destino'].includes(tripStatus) && (
                            <div className="text-xs text-white bg-green-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 mt-1 w-fit animate-pulse shadow-sm">
                              <Clock className="w-3 h-3" /> Chegada em {trip.current_eta_minutes} min
                            </div>
                          )}
                          
                          <div className="text-xs text-slate-400 truncate mt-0.5" title={origin}>
                            {origin}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhum embarque pendente próximo.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atividade Recente */}
          <Card className="md:col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((trip, idx) => (
                    <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                      <div className={`rounded-full p-1.5 flex-shrink-0 ${
                        trip.receptivity_status === 'efetuada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {trip.receptivity_status === 'efetuada' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-400 mb-0.5">
                          {format(parseISO(trip.receptivity_updated_at), "HH:mm", { locale: ptBR })}
                        </div>
                        <div className="font-medium text-sm truncate">{trip.passenger_name}</div>
                        <div className={`text-xs font-medium ${
                          trip.receptivity_status === 'efetuada' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trip.receptivity_status === 'efetuada' ? 'Embarque Realizado' : 'Não Compareceu'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhuma atividade recente registrada.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de No Shows */}
        {noShows.length > 0 && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                Participantes Ausentes (No Show)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {noShows.map((trip) => (
                  <Card key={trip.id} className="border border-red-200 bg-white">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-red-900">{trip.passenger_name}</div>
                        <div className="text-xs font-mono bg-red-100 text-red-700 px-2 py-1 rounded">
                          {trip.time}
                        </div>
                      </div>
                      {trip.receptivity_not_completed_reason && (
                        <div className="text-sm text-red-700 bg-red-50 p-2 rounded mt-2 italic">
                          "{trip.receptivity_not_completed_reason}"
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Plane className="w-3 h-3" /> 
                        {trip.origin_flight_number || trip.origin}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhamento por Abas */}
        <Card className="shadow-sm min-h-[500px]">
          <CardHeader className="pb-0">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <CardTitle>Passageiros e Viagens</CardTitle>
                <TabsList className="grid w-full grid-cols-2 h-auto md:flex md:w-auto">
                  <TabsTrigger value="all">Todos ({allPassengers.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pendentes ({stats?.passengersPending})</TabsTrigger>
                  <TabsTrigger value="completed">Embarcados ({stats?.passengersBoarded})</TabsTrigger>
                  <TabsTrigger value="noshow">No-Shows ({stats?.passengersNoShow})</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all">
                <PassengerList passengers={allPassengers} expandedRows={expandedRows} toggleRow={toggleRow} />
              </TabsContent>

              <TabsContent value="pending">
                <PassengerList 
                  passengers={allPassengers.filter(p => p.status === 'pending')}
                  expandedRows={expandedRows} 
                  toggleRow={toggleRow} 
                />
              </TabsContent>

              <TabsContent value="completed">
                <PassengerList 
                  passengers={allPassengers.filter(p => p.status === 'arrived')}
                  expandedRows={expandedRows} 
                  toggleRow={toggleRow} 
                />
              </TabsContent>

              <TabsContent value="noshow">
                <PassengerList 
                  passengers={allPassengers.filter(p => p.status === 'no_show')}
                  expandedRows={expandedRows} 
                  toggleRow={toggleRow} 
                />
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PassengerList({ passengers, expandedRows, toggleRow }) {
  if (!passengers || passengers.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p>Nenhum passageiro encontrado nesta categoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {passengers.map((pax) => (
        <div key={pax.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
          <div 
            className="p-4 cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center"
            onClick={() => toggleRow(pax.id)}
          >
            {/* Horário e Status */}
            <div className="flex items-center gap-3 min-w-[120px]">
              <div className={`px-3 py-1.5 rounded-md font-bold text-sm text-center min-w-[60px] ${
                pax.status === 'arrived' ? 'bg-green-100 text-green-700' :
                pax.status === 'no_show' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {pax.time}
              </div>
              <Badge className={`border-0 ${
                pax.status === 'arrived' ? 'bg-green-100 text-green-700' :
                pax.status === 'no_show' ? 'bg-red-100 text-red-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {pax.status === 'arrived' ? 'Embarcado' :
                 pax.status === 'no_show' ? 'No-Show' :
                 'Pendente'}
              </Badge>
            </div>

            {/* Info Principal */}
            <div className="flex-1 min-w-0 grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  {pax.passengerName}
                  {pax.isAddedByCoordinator && (
                    <Badge className="h-4 px-1 text-[9px] bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                      Novo
                    </Badge>
                  )}
                </div>
                 <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Plane className="w-3 h-3" /> {pax.flight || 'Voo não inf.'}
                 </div>
              </div>

              <div className="md:col-span-1 text-sm text-slate-600">
                <div className="flex items-center gap-2 mb-1">
                   <span className="truncate" title={pax.origin}>{pax.origin}</span>
                </div>
                {pax.driver && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded w-fit">
                    <Car className="w-3 h-3" />
                    {pax.driver}
                  </div>
                )}
              </div>

              {/* Status IDA / VOLTA Evidentes */}
              <div className="md:col-span-1 flex flex-col gap-1 justify-center">
                 {/* Status da IDA */}
                 {pax.originalRequest.receptivity_trip_status && pax.originalRequest.receptivity_trip_status !== 'aguardando' && (
                   <div className="flex items-center gap-2 text-xs">
                     <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1 h-4">IDA</Badge>
                     <StatusBadge status={pax.originalRequest.receptivity_trip_status} type="trip" className="text-[10px] h-5" />
                   </div>
                 )}
                 
                 {/* Status da VOLTA */}
                 {pax.originalRequest.service_type === 'round_trip' && (
                   <div className="flex items-center gap-2 text-xs mt-1">
                     <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1 h-4">VOLTA</Badge>
                     {pax.originalRequest.departure_trip_status && pax.originalRequest.departure_trip_status !== 'aguardando' ? (
                        <StatusBadge status={pax.originalRequest.departure_trip_status} type="trip" className="text-[10px] h-5" />
                     ) : (
                        <span className="text-slate-400">Aguardando</span>
                     )}
                   </div>
                 )}
              </div>
            </div>

            <div className="text-slate-400">
              {expandedRows.includes(pax.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {/* Detalhes Expandidos */}
          {expandedRows.includes(pax.id) && (
            <div className="bg-slate-50 border-t p-4">
               <div className="grid md:grid-cols-2 gap-6">
                  <div>
                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Detalhes da Viagem</h4>
                     <div className="bg-white p-3 rounded border space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                           <span className="text-slate-500">Destino</span>
                           <span className="font-medium text-right">{pax.destination}</span>
                        </div>
                         <div className="flex justify-between border-b pb-2">
                           <span className="text-slate-500">Data</span>
                           <span className="font-medium text-right">{format(parseISO(pax.date), 'dd/MM/yyyy')}</span>
                        </div>
                        {pax.driver && (
                          <div className="flex justify-between border-b pb-2">
                             <span className="text-slate-500">Motorista</span>
                             <div className="text-right">
                               <div className="font-medium text-green-700">{pax.driver}</div>
                               <div className="text-xs text-slate-500">{pax.vehicle} • {pax.plate}</div>
                               {pax.driverPhone && <div className="text-xs text-slate-500">{pax.driverPhone}</div>}
                               
                               {/* Status da IDA */}
                               {pax.originalRequest.receptivity_trip_status && pax.originalRequest.receptivity_trip_status !== 'aguardando' && (
                                 <div className="flex items-center justify-end gap-1 mt-1">
                                   <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100 font-semibold">IDA</span>
                                   <StatusBadge status={pax.originalRequest.receptivity_trip_status} type="trip" className="text-[10px] h-5" />
                                 </div>
                               )}

                               {/* Status da VOLTA */}
                               {pax.originalRequest.service_type === 'round_trip' && pax.originalRequest.departure_trip_status && pax.originalRequest.departure_trip_status !== 'aguardando' && (
                                 <div className="flex items-center justify-end gap-1 mt-1">
                                   <span className="text-[10px] bg-purple-50 text-purple-600 px-1 rounded border border-purple-100 font-semibold">VOLTA</span>
                                   <StatusBadge status={pax.originalRequest.departure_trip_status} type="trip" className="text-[10px] h-5" />
                                 </div>
                               )}

                               {/* ETA */}
                               {pax.originalRequest.current_eta_minutes && (
                                 <div className="text-xs text-orange-600 font-semibold flex items-center justify-end gap-1 mt-0.5">
                                   <Clock className="w-3 h-3" /> ETA: {pax.originalRequest.current_eta_minutes} min
                                 </div>
                               )}
                             </div>
                          </div>
                        )}
                        {pax.status === 'no_show' && pax.noShowReason && (
                           <div className="bg-red-50 p-2 rounded text-red-700 text-xs">
                              <strong>Motivo No-Show:</strong> {pax.noShowReason}
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}