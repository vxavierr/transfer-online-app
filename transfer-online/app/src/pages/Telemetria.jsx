import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  Car,
  Clock,
  MapPin,
  TrendingUp,
  User,
  Zap
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import L from 'leaflet';
import TelemetryReplayMap from '@/components/telemetry/TelemetryReplayMap';
import DriverRanking from '@/components/telemetry/DriverRanking';
import DriverFeedback from '@/components/telemetry/DriverFeedback';
import IncidentHeatmap from '@/components/telemetry/IncidentHeatmap';
import TelemetryCharts from '@/components/telemetry/TelemetryCharts';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const incidentIcons = {
  hard_brake: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
  speeding: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
  sharp_turn: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
  start: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
  end: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png', iconSize: [25, 41], iconAnchor: [12, 41] })
};

export default function Telemetria() {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [stats, setStats] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [driverTripsMap, setDriverTripsMap] = useState({});
  const [ranking, setRanking] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [driverReport, setDriverReport] = useState([]);
  const [activeTab, setActiveTab] = useState("monitoramento");

  useEffect(() => {
    loadDrivers();
    loadRanking();
    loadHotspots();
    }, []);

  useEffect(() => {
    if (selectedDriver && selectedDriver !== 'all') {
      loadDriverStats(selectedDriver);
      loadDriverTrips(selectedDriver);
    } else {
      setStats(null);
      setDriverTripsMap({});
    }
  }, [selectedDriver]);

  useEffect(() => {
    if (selectedSession) {
      loadSessionEvents(selectedSession.id);
    }
  }, [selectedSession]);

  const loadDrivers = async () => {
    const list = await base44.entities.Driver.list();
    setDrivers(list);
  };

  const loadDriverStats = async (driverId) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('telemetry', {
        action: 'getDriverStats',
        driverId
      });
      setStats(res.data);
      
      // Load report as well
      const reportRes = await base44.functions.invoke('telemetry', {
          action: 'getDriverReport',
          driverId
      });
      setDriverReport(reportRes.data.chartData);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadRanking = async () => {
      try {
          const res = await base44.functions.invoke('telemetry', { action: 'getDriverRanking' });
          setRanking(res.data.ranking);
      } catch (e) { console.error(e); }
  };

  const loadHotspots = async () => {
      try {
          const res = await base44.functions.invoke('telemetry', { action: 'getIncidentHotspots' });
          setHotspots(res.data.incidents);
      } catch (e) { console.error(e); }
  };

  const loadDriverTrips = async (driverId) => {
    try {
        // Fetch ServiceRequests (Recent 100)
        const srs = await base44.entities.ServiceRequest.filter({ driver_id: driverId }, '-created_date', 100);
        const map = {};
        srs.forEach(sr => {
            map[sr.id] = { number: sr.request_number, origin: sr.origin, destination: sr.destination };
        });
        
        // Fetch SupplierOwnBookings
        const sobs = await base44.entities.SupplierOwnBooking.filter({ driver_id: driverId }, '-created_date', 100);
        sobs.forEach(sob => {
            map[sob.id] = { number: sob.booking_number, origin: sob.origin, destination: sob.destination };
        });

        // Fetch EventTrips
        const ets = await base44.entities.EventTrip.filter({ driver_id: driverId }, '-created_date', 100);
        ets.forEach(et => {
             map[et.id] = { number: et.trip_code || et.name, origin: et.origin, destination: et.destination };
        });

        setDriverTripsMap(map);
    } catch (e) {
        console.error("Error loading trips lookup", e);
    }
  };

  const loadSessionEvents = async (sessionId) => {
    const events = await base44.entities.TelemetryEvent.filter({ session_id: sessionId });
    setSessionEvents(events.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)));
  };

  const handleForceFinalize = async (sessionId) => {
    if (!confirm('Deseja forçar a finalização desta sessão? O sistema tentará recalcular a distância com base nos eventos registrados.')) return;
    
    setLoading(true);
    try {
        await base44.functions.invoke('telemetry', {
            action: 'finalizeSession',
            sessionId: sessionId,
            finalStats: null // Force reconstruction
        });
        alert('Sessão finalizada com sucesso. Recarregando dados...');
        // Reload
        if (selectedDriver) loadDriverStats(selectedDriver);
        setSelectedSession(null);
    } catch (e) {
        console.error(e);
        alert('Erro ao finalizar sessão.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
             <Activity className="w-8 h-8 text-blue-600" />
             Telemetria e Segurança
           </h1>
           <p className="text-gray-500">Monitoramento de desempenho e comportamento de direção</p>
        </div>
        <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um Motorista" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Selecione...</SelectItem>
                {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      {!stats && (
          <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600">Selecione um motorista para ver a análise</h3>
          </div>
      )}

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1 border">
            <TabsTrigger value="monitoramento">Monitoramento Individual</TabsTrigger>
            <TabsTrigger value="ranking">Ranking e Gamificação</TabsTrigger>
            <TabsTrigger value="mapa_calor">Mapa de Incidentes</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="animate-in fade-in duration-500">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <DriverRanking ranking={ranking} />
                </div>
                <div className="md:col-span-1">
                    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="w-5 h-5" />
                                Programa Motorista 5 Estrelas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-indigo-100 text-sm mb-4">
                                Os motoristas com nota de segurança acima de 95 concorrem a prêmios mensais exclusivos.
                            </p>
                            <ul className="text-sm space-y-2">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-400" />
                                    1º Lugar: Bônus de R$ 500
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                    2º Lugar: Bônus de R$ 300
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                                    3º Lugar: Bônus de R$ 100
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="mapa_calor" className="animate-in fade-in duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>Pontos Críticos de Incidentes (Global)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <IncidentHeatmap incidents={hotspots} />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="monitoramento" className="space-y-6 animate-in fade-in duration-500">
      {stats && (
        <div className="space-y-6">
            {/* Feedback Section */}
            {stats.feedback && <DriverFeedback feedback={stats.feedback} />}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Nota de Segurança</p>
                                <h3 className="text-4xl font-bold mt-1">{Number(stats.avgScore || 0).toFixed(1)}</h3>
                            </div>
                            <Award className="w-8 h-8 text-blue-200" />
                        </div>
                        <div className="mt-4 text-xs text-blue-100">Média geral</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Viagens Monitoradas</p>
                                <h3 className="text-3xl font-bold mt-1 text-gray-900">{stats.totalTrips}</h3>
                            </div>
                            <Car className="w-6 h-6 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Km Monitorados</p>
                                <h3 className="text-3xl font-bold mt-1 text-gray-900">{Number(stats.totalDistance || 0).toFixed(2)}</h3>
                            </div>
                            <MapPin className="w-6 h-6 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-sm font-medium">Incidentes Totais</p>
                                <h3 className="text-3xl font-bold mt-1 text-red-600">{stats.totalIncidents}</h3>
                            </div>
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Session List */}
                <div className="md:col-span-3">
                    <TelemetryCharts data={driverReport} />
                </div>

                {selectedSession && (
                    <div className="md:col-span-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Incidentes Detalhados</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-100">
                                    {sessionEvents.filter(e => ['hard_brake', 'speeding', 'sharp_turn', 'phone_usage'].includes(e.type)).length > 0 ? (
                                        sessionEvents.filter(e => ['hard_brake', 'speeding', 'sharp_turn', 'phone_usage'].includes(e.type)).map((incident, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-800 capitalize">
                                                        {incident.type === 'hard_brake' && 'Frenagem Brusca'}
                                                        {incident.type === 'speeding' && 'Excesso de Velocidade'}
                                                        {incident.type === 'sharp_turn' && 'Curva Acentuada'}
                                                        {incident.type === 'phone_usage' && 'Uso de Telefone'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {format(parseISO(incident.timestamp), "dd/MM/yyyy HH:mm:ss")}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-700 font-medium">
                                                    {incident.speed && `Velocidade: ${Number(incident.speed).toFixed(0)} km/h`}
                                                    {incident.value && incident.type !== 'speeding' && ` | Valor: ${Number(incident.value).toFixed(1)}`}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-gray-500 text-center">
                                            Nenhum incidente detalhado registrado nesta sessão.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Card className="md:col-span-1 h-[600px] flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg">Histórico de Viagens</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        {stats.sessions.map(session => (
                            <div 
                                key={session.id} 
                                onClick={() => setSelectedSession(session)}
                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedSession?.id === session.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex gap-2">
                                        <Badge variant={session.safety_score > 80 ? 'default' : 'destructive'} className={session.safety_score > 80 ? 'bg-green-600' : ''}>
                                            Nota {session.safety_score}
                                        </Badge>
                                        {session.status === 'active' && <Badge variant="outline" className="text-blue-600 border-blue-200 animate-pulse">Ativa</Badge>}
                                    </div>
                                    <span className="text-xs text-gray-500">{format(parseISO(session.start_time), "dd/MM HH:mm")}</span>
                                </div>
                                {driverTripsMap[session.trip_id] && (
                                    <div className="text-xs font-bold text-blue-700 mt-1">
                                        {driverTripsMap[session.trip_id].number}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                                    <TrendingUp className="w-4 h-4 text-gray-400" />
                                    <span>{(session.distance_km || 0).toFixed(2)} km</span>
                                    <span className="text-gray-300">|</span>
                                    <Zap className="w-4 h-4 text-gray-400" />
                                    <span>Max: {(session.max_speed || 0).toFixed(0)} km/h</span>
                                </div>
                                {(session.total_hard_brakes > 0 || session.total_speeding_events > 0) && (
                                    <div className="mt-2 flex gap-2">
                                        {session.total_hard_brakes > 0 && <Badge variant="outline" className="text-red-600 border-red-200 text-[10px]">{session.total_hard_brakes} Frenagens</Badge>}
                                        {session.total_speeding_events > 0 && <Badge variant="outline" className="text-orange-600 border-orange-200 text-[10px]">{session.total_speeding_events} Vel.</Badge>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Map Details */}
                <Card className="md:col-span-2 h-[600px] flex flex-col">
                    <CardHeader className="border-b bg-gray-50/50 py-3">
                         <div className="flex justify-between items-center">
                             <CardTitle className="text-lg">
                                 {selectedSession ? `Análise da Viagem` : 'Selecione uma viagem'}
                             </CardTitle>
                             {selectedSession && (
                                 <div className="flex items-center gap-4 text-sm">
                                     <div>
                                         <span className="text-gray-500">Início:</span> {format(parseISO(selectedSession.start_time), "HH:mm")}
                                     </div>
                                     <div>
                                         <span className="text-gray-500">Fim:</span> {selectedSession.end_time ? format(parseISO(selectedSession.end_time), "HH:mm") : '-'}
                                     </div>
                                     {selectedSession.status === 'active' && (
                                         <Button 
                                           size="sm" 
                                           variant="destructive" 
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               handleForceFinalize(selectedSession.id);
                                           }}
                                           className="h-7 text-xs"
                                         >
                                           Forçar Finalização
                                         </Button>
                                     )}
                                 </div>
                             )}
                         </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 relative">
                        {selectedSession ? (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 relative">
                                    <Tabs defaultValue="map" className="h-full flex flex-col">
                                        <div className="absolute top-2 right-2 z-[400] bg-white rounded-lg shadow-md p-1">
                                            <TabsList>
                                                <TabsTrigger value="map">Mapa</TabsTrigger>
                                                <TabsTrigger value="replay">Replay</TabsTrigger>
                                            </TabsList>
                                        </div>
                                        
                                        <TabsContent value="map" className="h-full mt-0">
                                            <MapContainer 
                                                center={[0,0]} // Will update with bounds
                                                zoom={13} 
                                                style={{ height: '100%', width: '100%' }}
                                                ref={(map) => {
                                                    if (map && sessionEvents.length > 0) {
                                                        const validPoints = sessionEvents
                                                            .filter(e => e.latitude && e.longitude && (e.latitude !== 0 || e.longitude !== 0))
                                                            .map(e => [e.latitude, e.longitude]);
                                                        
                                                        if (validPoints.length > 0) {
                                                            const bounds = L.latLngBounds(validPoints);
                                                            if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
                                                        }
                                                    }
                                                }}
                                            >
                                                <TileLayer
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                />
                                                
                                                <Polyline 
                                                    positions={sessionEvents
                                                        .filter(e => (e.type === 'location_update' || e.type === 'trip_start' || e.type === 'trip_end') && e.latitude && e.longitude && (e.latitude !== 0 || e.longitude !== 0))
                                                        .map(e => [e.latitude, e.longitude])}
                                                    color="blue"
                                                    weight={4}
                                                    opacity={0.6}
                                                />

                                                {sessionEvents.map((event, idx) => {
                                                    if (['location_update', 'acceleration'].includes(event.type)) return null;
                                                    
                                                    const icon = incidentIcons[event.type] || incidentIcons.start;
                                                    if (event.type === 'trip_start') return <Marker key={idx} position={[event.latitude, event.longitude]} icon={incidentIcons.start}><Popup>Início</Popup></Marker>;
                                                    if (event.type === 'trip_end') return <Marker key={idx} position={[event.latitude, event.longitude]} icon={incidentIcons.end}><Popup>Fim</Popup></Marker>;

                                                    return (
                                                        <Marker key={idx} position={[event.latitude, event.longitude]} icon={icon}>
                                                            <Popup>
                                                                <div className="font-bold capitalize">{event.type.replace('_', ' ')}</div>
                                                                <div>Velocidade: {Number(event.speed || 0).toFixed(0)} km/h</div>
                                                                <div>{format(parseISO(event.timestamp), "HH:mm:ss")}</div>
                                                            </Popup>
                                                        </Marker>
                                                    )
                                                })}
                                            </MapContainer>
                                        </TabsContent>
                                        
                                        <TabsContent value="replay" className="h-full mt-0">
                                            <TelemetryReplayMap events={sessionEvents} />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-gray-50">
                                <div className="text-center text-gray-400">
                                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>Mapa da rota</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      )}
      </TabsContent>
      </Tabs>
    </div>
  );
}