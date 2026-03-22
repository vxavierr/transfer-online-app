import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGoogleMapsReady } from '@/components/booking/GoogleMapsLoader';
import {
  Loader2,
  MapPin,
  Navigation,
  Car,
  User,
  RefreshCw,
  Info
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function LocalizacaoMotoristas() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const infoWindowsRef = useRef({});
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tripDetails, setTripDetails] = useState(null);
  
  const { isReady: googleMapsLoaded } = useGoogleMapsReady();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        const isAdmin = currentUser.role === 'admin';
        const isSupplier = currentUser.supplier_id && !isAdmin;
        
        if (isSupplier) {
          const supplier = await base44.entities.Supplier.get(currentUser.supplier_id);
          if (!supplier.features?.driver_tracking_access) {
            alert('Você não tem permissão para acessar esta funcionalidade.');
            window.location.href = '/DashboardFornecedor';
            return;
          }
        } else if (!isAdmin) {
          alert('Acesso restrito.');
          window.location.href = '/';
          return;
        }

        setUser(currentUser);
        setIsAuthChecking(false);
      } catch (error) {
        console.error('Erro auth:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FLocalizacaoMotoristas';
      }
    };
    checkAuth();
  }, []);

  // Buscar motoristas ativos
  const { data: activeTrips = [], refetch } = useQuery({
    queryKey: ['activeDriversLocations'],
    queryFn: async () => {
      const baseFilters = {
        driver_trip_status: { $in: ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'a_caminho_destino', 'parada_adicional'] }
      };
      
      let requestFilters = { ...baseFilters };
      let ownBookingFilters = { ...baseFilters };

      if (user?.supplier_id) {
        requestFilters.chosen_supplier_id = user.supplier_id;
        ownBookingFilters.supplier_id = user.supplier_id;
      }

      const [requests, ownBookings] = await Promise.all([
        base44.entities.ServiceRequest.filter(requestFilters),
        base44.entities.SupplierOwnBooking.filter(ownBookingFilters)
      ]);

      // Garantir que ownBookings tenham campos compatíveis para exibição
      const normalizedOwnBookings = ownBookings.map(booking => ({
        ...booking,
        request_number: booking.booking_number,
        // Adicionar outros campos se necessário para compatibilidade visual
      }));

      const allTrips = [...requests, ...normalizedOwnBookings];
      return allTrips; // Retorna todas as viagens ativas, mesmo sem GPS, para mostrar na lista
    },
    enabled: !!user && !isAuthChecking,
    refetchInterval: 10000 
  });

  // Inicializar mapa
  useEffect(() => {
    if (googleMapsLoaded && !mapRef.current && !isAuthChecking && document.getElementById('map')) {
      try {
        mapRef.current = new window.google.maps.Map(document.getElementById('map'), {
          center: { lat: -23.550520, lng: -46.633308 }, 
          zoom: 11,
          styles: [
              {
                  "featureType": "poi",
                  "stylers": [{ "visibility": "off" }]
              }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        });
      } catch (e) {
        console.error("Erro ao inicializar mapa:", e);
      }
    }
  }, [googleMapsLoaded, isAuthChecking]);

  // Atualizar marcadores
  useEffect(() => {
    if (!mapRef.current || !activeTrips) return;

    const currentIds = new Set();
    const bounds = new window.google.maps.LatLngBounds();
    const now = new Date();

    activeTrips.forEach(trip => {
      // Só plota no mapa se tiver coordenadas válidas
      if (!trip.current_location_lat || !trip.current_location_lon) return;
      
      // Opcional: Filtrar visualmente marcadores muito antigos se desejar, 
      // mas vamos manter para ver a última posição conhecida
      
      currentIds.add(trip.id);
      
      const lat = parseFloat(trip.current_location_lat);
      const lng = parseFloat(trip.current_location_lon);
      const position = { lat, lng };
      bounds.extend(position);

      if (markersRef.current[trip.id]) {
        const marker = markersRef.current[trip.id];
        marker.setPosition(position);
        // Atualiza ícone caso status mude
        const icon = {
          path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
          fillColor: getStatusColor(trip.driver_trip_status),
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: 'white',
          scale: 1.2,
          anchor: new window.google.maps.Point(12, 10)
        };
        marker.setIcon(icon);

        // Atualiza conteúdo do InfoWindow se necessário (opcional, aqui recriamos para garantir dados frescos)
        // Mas o InfoWindow só é criado uma vez. Se quiser atualizar conteúdo dinâmico, teria que guardar ref do InfoWindow.
        if (infoWindowsRef.current[trip.id]) {
           const contentString = `
                <div style="padding: 8px; min-width: 220px; font-family: sans-serif;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                      <div style="background-color: ${getStatusColor(trip.driver_trip_status)}; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px;"></div>
                      <h3 style="font-weight: bold; margin: 0; font-size: 14px;">${trip.driver_name}</h3>
                    </div>
                    <p style="font-size: 12px; color: #555; margin: 2px 0;">🚗 ${trip.vehicle_model} • ${trip.vehicle_plate}</p>
                    <div style="border-top: 1px solid #eee; margin: 8px 0;"></div>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Passageiro:</strong> ${trip.passenger_name}</p>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${formatStatus(trip.driver_trip_status)}</p>
                    ${trip.current_speed !== undefined && trip.current_speed !== null ? `<p style="margin: 4px 0; font-size: 12px; color: #2563eb;"><strong>Velocidade:</strong> ${Math.round(trip.current_speed)} km/h</p>` : ''}
                    <p style="font-size: 11px; color: #888; margin-top: 8px;">
                        🕒 Atualizado: ${format(parseISO(trip.location_last_updated_at), 'HH:mm')}
                    </p>
                    <button id="btn-details-${trip.id}" style="background-color: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; width: 100%; margin-top: 8px;">
                      Ver Detalhes Completos
                    </button>
                </div>
            `;
            infoWindowsRef.current[trip.id].setContent(contentString);
        }

      } else {
        const marker = new window.google.maps.Marker({
          position,
          map: mapRef.current,
          title: trip.driver_name,
          icon: {
             path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
             scale: 1.2,
             fillColor: getStatusColor(trip.driver_trip_status),
             fillOpacity: 1,
             strokeWeight: 1,
             strokeColor: 'white',
             anchor: new window.google.maps.Point(12, 10)
          }
        });

        const contentString = `
            <div style="padding: 8px; min-width: 220px; font-family: sans-serif;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <div style="background-color: ${getStatusColor(trip.driver_trip_status)}; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px;"></div>
                  <h3 style="font-weight: bold; margin: 0; font-size: 14px;">${trip.driver_name}</h3>
                </div>
                <p style="font-size: 12px; color: #555; margin: 2px 0;">🚗 ${trip.vehicle_model} • ${trip.vehicle_plate}</p>
                <div style="border-top: 1px solid #eee; margin: 8px 0;"></div>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Passageiro:</strong> ${trip.passenger_name}</p>
                <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${formatStatus(trip.driver_trip_status)}</p>
                <p style="font-size: 11px; color: #888; margin-top: 8px;">
                    🕒 Atualizado: ${format(parseISO(trip.location_last_updated_at), 'HH:mm')}
                </p>
                <button id="btn-details-${trip.id}" style="background-color: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; width: 100%; margin-top: 8px;">
                  Ver Detalhes Completos
                </button>
            </div>
        `;

        const infoWindow = new window.google.maps.InfoWindow({
            content: contentString
        });

        // Hack para adicionar evento no botão dentro do InfoWindow
        window.google.maps.event.addListener(infoWindow, 'domready', () => {
           const btn = document.getElementById(`btn-details-${trip.id}`);
           if (btn) {
              btn.addEventListener('click', () => {
                 setTripDetails(trip);
                 setDetailsOpen(true);
              });
           }
        });

        marker.addListener('click', () => {
          // Fechar outros InfoWindows
          Object.values(infoWindowsRef.current).forEach(iw => iw.close());
          infoWindow.open(mapRef.current, marker);
          setSelectedDriver(trip);
        });

        markersRef.current[trip.id] = marker;
        infoWindowsRef.current[trip.id] = infoWindow;
      }
      });

      Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
        delete infoWindowsRef.current[id];
      }
      });

    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });
  }, [activeTrips]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'a_caminho': return '#FFA500';
      case 'chegou_origem': return '#FFFF00';
      case 'passageiro_embarcou': return '#008000';
      case 'a_caminho_destino': return '#0000FF';
      default: return '#808080';
    }
  };

  const formatStatus = (status) => {
    const map = {
      'a_caminho': 'A caminho da origem',
      'chegou_origem': 'Chegou na origem',
      'passageiro_embarcou': 'Embarcou / Em viagem',
      'a_caminho_destino': 'A caminho do destino',
      'parada_adicional': 'Em parada'
    };
    return map[status] || status;
  };

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Localização em Tempo Real
          </h1>
          <p className="text-sm text-gray-500">
            Monitoramento de motoristas ativos
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             Atualizando a cada 10s
           </div>
           <Button variant="outline" size="sm" onClick={() => refetch()}>
             <RefreshCw className="w-4 h-4 mr-2" />
             Atualizar
           </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-80 bg-white border-r overflow-y-auto hidden md:block z-10 shadow-lg">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Viagens Ativas ({activeTrips.length})
            </h2>
          </div>
          
          <div className="divide-y">
            {activeTrips.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Car className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhum motorista ativo no momento</p>
              </div>
            ) : (
              activeTrips.map(trip => (
                <div 
                  key={trip.id} 
                  className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors border-b ${selectedDriver?.id === trip.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                  onClick={() => {
                    setSelectedDriver(trip);
                    if (mapRef.current && trip.current_location_lat && trip.current_location_lon) {
                        mapRef.current.panTo({ 
                          lat: parseFloat(trip.current_location_lat), 
                          lng: parseFloat(trip.current_location_lon) 
                        });
                        mapRef.current.setZoom(15);

                        // Abrir InfoWindow correspondente
                        const marker = markersRef.current[trip.id];
                        const infoWindow = infoWindowsRef.current[trip.id];

                        if (marker && infoWindow) {
                          Object.values(infoWindowsRef.current).forEach(iw => iw.close());
                          infoWindow.open(mapRef.current, marker);
                        }
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{trip.driver_name}</h3>
                    {trip.location_last_updated_at ? (
                      <div className="flex gap-1">
                        {trip.current_speed !== undefined && trip.current_speed !== null && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                            {Math.round(trip.current_speed)} km/h
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs ${
                          (new Date() - parseISO(trip.location_last_updated_at)) / 1000 / 60 > 15 
                            ? 'bg-red-50 text-red-600 border-red-200' 
                            : 'bg-green-50 text-green-600 border-green-200'
                        }`}>
                          {format(parseISO(trip.location_last_updated_at), 'HH:mm')}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500 border-gray-200">
                        Sem GPS
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Car className="w-3 h-3" /> {trip.vehicle_model} • {trip.vehicle_plate}
                  </div>
                  <div className="text-sm text-gray-800 mb-2 truncate">
                    <User className="w-3 h-3 inline mr-1 text-gray-400" />
                    {trip.passenger_name}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2">
                     <Badge className={`
                      flex-1 justify-center
                      ${trip.driver_trip_status.includes('caminho') ? 'bg-blue-100 text-blue-800' : 
                        trip.driver_trip_status === 'passageiro_embarcou' ? 'bg-green-100 text-green-800' : 
                        'bg-yellow-100 text-yellow-800'}
                    `}>
                      {formatStatus(trip.driver_trip_status)}
                    </Badge>

                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTripDetails(trip);
                        setDetailsOpen(true);
                      }}
                    >
                       <Info className="w-4 h-4 text-blue-600" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 relative bg-gray-200">
          {!googleMapsLoaded && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
                 <div className="text-center">
                     <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-2" />
                     <p className="text-gray-500">Carregando mapa...</p>
                 </div>
             </div>
          )}
          <div id="map" className="w-full h-full" />
          </div>
          </div>

          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Viagem</DialogTitle>
            <DialogDescription>
              Informações completas da solicitação em andamento
            </DialogDescription>
          </DialogHeader>

          {tripDetails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div>
                   <p className="text-sm text-gray-500">Número</p>
                   <p className="font-bold text-lg">{tripDetails.request_number}</p>
                </div>
                <Badge className={getStatusColor(tripDetails.driver_trip_status)}>
                  {formatStatus(tripDetails.driver_trip_status)}
                </Badge>
              </div>

              {tripDetails.current_speed !== undefined && tripDetails.current_speed !== null && (
                <div className="flex items-center gap-2 bg-blue-50 p-2 rounded text-blue-700 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Velocidade Atual: {Math.round(tripDetails.current_speed)} km/h
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Motorista</h4>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                     </div>
                     <div>
                       <p className="font-medium">{tripDetails.driver_name}</p>
                       <p className="text-sm text-gray-500">{tripDetails.vehicle_model} • {tripDetails.vehicle_plate}</p>
                     </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Passageiro</h4>
                  <p className="font-medium">{tripDetails.passenger_name}</p>
                  {tripDetails.passenger_phone && (
                    <p className="text-sm text-gray-500">{tripDetails.passenger_phone}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <h4 className="text-sm font-medium text-gray-500 mb-1">Origem</h4>
                     <p className="text-sm">{tripDetails.origin}</p>
                  </div>
                  <div>
                     <h4 className="text-sm font-medium text-gray-500 mb-1">Destino</h4>
                     <p className="text-sm">{tripDetails.destination}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <h4 className="text-sm font-medium text-gray-500 mb-1">Data</h4>
                     <p className="text-sm">
                       {tripDetails.date ? format(parseISO(tripDetails.date), 'dd/MM/yyyy') : '-'}
                     </p>
                  </div>
                  <div>
                     <h4 className="text-sm font-medium text-gray-500 mb-1">Horário</h4>
                     <p className="text-sm">{tripDetails.time}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
             <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>
          </div>
          );
          }