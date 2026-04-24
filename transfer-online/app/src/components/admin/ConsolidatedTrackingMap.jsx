import React, { useState, useEffect, useRef } from 'react';
import { useGoogleMapsReady } from '@/components/booking/GoogleMapsLoader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Navigation, Eye, EyeOff, Maximize2, Loader2, Gauge } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ConsolidatedTrackingMap({ trips = [] }) {
  const { isReady: googleMapsLoaded } = useGoogleMapsReady();
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const infoWindowsRef = useRef({});
  const [visibleTrips, setVisibleTrips] = useState(new Set());
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Inicializar todos como visíveis
  useEffect(() => {
    if (trips.length > 0 && visibleTrips.size === 0) {
      setVisibleTrips(new Set(trips.map(t => t.id)));
    }
  }, [trips]);

  // Inicializar mapa
  useEffect(() => {
    if (googleMapsLoaded && !mapRef.current && document.getElementById('consolidated-map')) {
      mapRef.current = new window.google.maps.Map(document.getElementById('consolidated-map'), {
        center: { lat: -23.550520, lng: -46.633308 }, 
        zoom: 11,
        styles: [{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
    }
  }, [googleMapsLoaded]);

  // Atualizar marcadores
  useEffect(() => {
    if (!mapRef.current || !trips) return;

    const currentIds = new Set();
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;

    trips.forEach(trip => {
      if (!trip.current_location_lat || !trip.current_location_lon) return;
      
      const shouldShow = visibleTrips.has(trip.id);
      currentIds.add(trip.id);
      
      const lat = parseFloat(trip.current_location_lat);
      const lng = parseFloat(trip.current_location_lon);
      const position = { lat, lng };

      if (shouldShow) {
        bounds.extend(position);
        hasValidMarkers = true;
      }

      const icon = {
        path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
        fillColor: getStatusColor(trip.driver_trip_status),
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: 'white',
        scale: 1.2,
        anchor: new window.google.maps.Point(12, 10)
      };

      if (markersRef.current[trip.id]) {
        const marker = markersRef.current[trip.id];
        marker.setPosition(position);
        marker.setIcon(icon);
        marker.setVisible(shouldShow);
        
        if (infoWindowsRef.current[trip.id]) {
          const contentString = getInfoWindowContent(trip);
          infoWindowsRef.current[trip.id].setContent(contentString);
        }
      } else {
        const marker = new window.google.maps.Marker({
          position,
          map: mapRef.current,
          title: trip.driver_name,
          icon,
          visible: shouldShow
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: getInfoWindowContent(trip)
        });

        marker.addListener('click', () => {
          Object.values(infoWindowsRef.current).forEach(iw => iw.close());
          infoWindow.open(mapRef.current, marker);
          setSelectedTrip(trip);
        });

        markersRef.current[trip.id] = marker;
        infoWindowsRef.current[trip.id] = infoWindow;
      }
    });

    // Remover marcadores antigos
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
        delete infoWindowsRef.current[id];
      }
    });

    // Ajustar zoom para mostrar todos os marcadores visíveis
    if (hasValidMarkers && visibleTrips.size > 0) {
      mapRef.current.fitBounds(bounds);
      
      // Se só tiver um marcador, evitar zoom muito próximo
      if (visibleTrips.size === 1) {
        const listener = window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
          if (mapRef.current.getZoom() > 15) mapRef.current.setZoom(15);
        });
      }
    }
  }, [trips, visibleTrips]);

  const getInfoWindowContent = (trip) => {
    return `
      <div style="padding: 8px; min-width: 220px; font-family: sans-serif;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="background-color: ${getStatusColor(trip.driver_trip_status)}; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px;"></div>
          <h3 style="font-weight: bold; margin: 0; font-size: 14px;">${trip.driver_name}</h3>
        </div>
        <p style="font-size: 12px; color: #555; margin: 2px 0;">🚗 ${trip.vehicle_model || 'N/A'} • ${trip.vehicle_plate || 'N/A'}</p>
        <div style="border-top: 1px solid #eee; margin: 8px 0;"></div>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Viagem:</strong> ${trip.request_number || trip.booking_number}</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Passageiro:</strong> ${trip.passenger_name}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${formatStatus(trip.driver_trip_status)}</p>
        ${trip.current_speed !== undefined && trip.current_speed !== null ? `<p style="margin: 4px 0; font-size: 12px; color: #2563eb;"><strong>Velocidade:</strong> ${Math.round(trip.current_speed)} km/h</p>` : ''}
        <p style="font-size: 11px; color: #888; margin-top: 8px;">
          🕒 Atualizado: ${trip.location_last_updated_at ? format(parseISO(trip.location_last_updated_at), 'HH:mm') : 'N/A'}
        </p>
      </div>
    `;
  };

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

  const toggleTripVisibility = (tripId) => {
    const newVisible = new Set(visibleTrips);
    if (newVisible.has(tripId)) {
      newVisible.delete(tripId);
    } else {
      newVisible.add(tripId);
    }
    setVisibleTrips(newVisible);
  };

  const toggleAllVisibility = () => {
    if (visibleTrips.size === trips.length) {
      setVisibleTrips(new Set());
    } else {
      setVisibleTrips(new Set(trips.map(t => t.id)));
    }
  };

  const focusOnTrip = (trip) => {
    if (trip.current_location_lat && trip.current_location_lon && mapRef.current) {
      mapRef.current.panTo({
        lat: parseFloat(trip.current_location_lat),
        lng: parseFloat(trip.current_location_lon)
      });
      mapRef.current.setZoom(15);
      
      const marker = markersRef.current[trip.id];
      const infoWindow = infoWindowsRef.current[trip.id];
      
      if (marker && infoWindow) {
        Object.values(infoWindowsRef.current).forEach(iw => iw.close());
        infoWindow.open(mapRef.current, marker);
      }
      
      setSelectedTrip(trip);
    }
  };

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Navigation className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhuma viagem ativa com rastreamento no momento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Mapa Consolidado - Motoristas em Tempo Real ({trips.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Maximize2 className="w-4 h-4 mr-2" />
          {isExpanded ? 'Minimizar' : 'Expandir'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4" style={{ height: isExpanded ? 'calc(100vh - 200px)' : '600px' }}>
          {/* Sidebar com lista de motoristas */}
          <div className="w-80 bg-gray-50 rounded-lg border border-gray-200 flex flex-col">
            <div className="p-4 border-b bg-white rounded-t-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Motoristas Ativos</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllVisibility}
                  className="text-xs"
                >
                  {visibleTrips.size === trips.length ? (
                    <><EyeOff className="w-3 h-3 mr-1" /> Ocultar Todos</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" /> Mostrar Todos</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {visibleTrips.size} de {trips.length} visíveis
              </p>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {trips.map(trip => {
                  const isVisible = visibleTrips.has(trip.id);
                  const hasLocation = trip.current_location_lat && trip.current_location_lon;
                  const isSelected = selectedTrip?.id === trip.id;

                  return (
                    <div
                      key={trip.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-300 shadow-sm' 
                          : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
                      } ${!hasLocation ? 'opacity-60' : ''}`}
                      onClick={() => hasLocation && focusOnTrip(trip)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isVisible}
                          onCheckedChange={() => toggleTripVisibility(trip.id)}
                          disabled={!hasLocation}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: getStatusColor(trip.driver_trip_status) }}
                            />
                            <span className="font-semibold text-sm truncate">{trip.driver_name}</span>
                          </div>
                          
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <div className="truncate">🚗 {trip.vehicle_model || 'N/A'} • {trip.vehicle_plate || 'N/A'}</div>
                            <div className="truncate font-medium">{trip.request_number || trip.booking_number}</div>
                            <div className="truncate">👤 {trip.passenger_name}</div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`text-[10px] px-1.5 py-0 h-5 ${
                                trip.driver_trip_status?.includes('caminho') ? 'bg-blue-100 text-blue-800' : 
                                trip.driver_trip_status === 'passageiro_embarcou' ? 'bg-green-100 text-green-800' : 
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {formatStatus(trip.driver_trip_status)}
                              </Badge>

                              {(() => {
                                const speed = trip.current_speed !== undefined && trip.current_speed !== null ? Math.round(trip.current_speed) : null;
                                return (
                                  <Badge className={`text-[10px] px-1.5 py-0 h-5 font-bold ${
                                    speed === null 
                                      ? 'bg-gray-100 text-gray-500'
                                      : speed === 0 
                                        ? 'bg-gray-100 text-gray-600' 
                                        : speed > 100 
                                          ? 'bg-red-100 text-red-700' 
                                          : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    <Gauge className="w-3 h-3 mr-0.5" />
                                    {speed !== null ? `${speed} km/h` : '-- km/h'}
                                  </Badge>
                                );
                              })()}
                            </div>

                            {trip.location_last_updated_at && (
                              <div className="text-[10px] text-gray-400">
                                Atualizado: {format(parseISO(trip.location_last_updated_at), 'HH:mm')}
                              </div>
                            )}
                            
                            {!hasLocation && (
                              <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-500">
                                Sem GPS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Mapa */}
          <div className="flex-1 relative bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
            {!googleMapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-500">Carregando mapa...</p>
                </div>
              </div>
            )}
            <div id="consolidated-map" className="w-full h-full" />
            
            {/* Legenda */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Status dos Motoristas</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFA500' }} />
                  <span>A caminho</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFFF00' }} />
                  <span>Chegou na origem</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#008000' }} />
                  <span>Passageiro embarcou</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0000FF' }} />
                  <span>A caminho destino</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
    'a_caminho': 'A caminho',
    'chegou_origem': 'Na origem',
    'passageiro_embarcou': 'Em viagem',
    'a_caminho_destino': 'Indo ao destino',
    'parada_adicional': 'Em parada'
  };
  return map[status] || status;
};