import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Navigation, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleMapsReady } from '@/components/booking/GoogleMapsLoader';

export default function LiveTrackingMap({ serviceRequest, showDriverLocation = true }) {
  const { isReady, error: mapError } = useGoogleMapsReady();
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState({});
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar mapa
  useEffect(() => {
    if (!isReady || !mapRef.current || map) return;

    const newMap = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    setMap(newMap);
    setIsLoading(false);

    const newDirectionsRenderer = new window.google.maps.DirectionsRenderer({
      map: newMap,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#3B82F6',
        strokeWeight: 4
      }
    });

    setDirectionsRenderer(newDirectionsRenderer);
    setIsLoading(false);
  }, [isReady]);

  // Atualizar mapa com localização do motorista e rota
  useEffect(() => {
    if (!map || !serviceRequest) return;

    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();

    // Limpar marcadores antigos
    Object.values(markers).forEach(marker => marker.setMap(null));
    const newMarkers = {};

    // Se há localização do motorista em tempo real
    if (showDriverLocation && serviceRequest.current_location_lat && serviceRequest.current_location_lon) {
      const driverPosition = {
        lat: serviceRequest.current_location_lat,
        lng: serviceRequest.current_location_lon
      };

      // Marcador do motorista
      const driverMarker = new window.google.maps.Marker({
        position: driverPosition,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        },
        title: 'Motorista'
      });

      newMarkers.driver = driverMarker;
      bounds.extend(driverPosition);

      // Se o passageiro já embarcou, mostrar rota do motorista até o destino
      if (serviceRequest.driver_trip_status === 'passageiro_embarcou' && serviceRequest.destination) {
        const directionsService = new window.google.maps.DirectionsService();
        
        directionsService.route({
          origin: driverPosition,
          destination: serviceRequest.destination,
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (result, status) => {
          if (status === 'OK' && directionsRenderer) {
            directionsRenderer.setDirections(result);
          }
        });
      }
    }

    // Geocodificar e adicionar marcador de origem
    if (serviceRequest.origin) {
      geocoder.geocode({ address: serviceRequest.origin }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const originMarker = new window.google.maps.Marker({
            position: results[0].geometry.location,
            map: map,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="#10B981" stroke="#fff" stroke-width="2"/>
                  <text x="12" y="16" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">O</text>
                </svg>
              `)
            },
            title: 'Origem'
          });
          
          newMarkers.origin = originMarker;
          bounds.extend(results[0].geometry.location);

          // Ajustar zoom se temos marcadores
          if (Object.keys(newMarkers).length > 0) {
            map.fitBounds(bounds);
          }
        }
      });
    }

    // Geocodificar e adicionar marcador de destino
    if (serviceRequest.destination) {
      geocoder.geocode({ address: serviceRequest.destination }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const destMarker = new window.google.maps.Marker({
            position: results[0].geometry.location,
            map: map,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="#EF4444" stroke="#fff" stroke-width="2"/>
                  <text x="12" y="16" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">D</text>
                </svg>
              `)
            },
            title: 'Destino'
          });
          
          newMarkers.destination = destMarker;
          bounds.extend(results[0].geometry.location);

          // Ajustar zoom se temos marcadores
          if (Object.keys(newMarkers).length > 0) {
            map.fitBounds(bounds);
          }
        }
      });
    }

    setMarkers(newMarkers);

  }, [map, serviceRequest, showDriverLocation]);

  if (!serviceRequest) return null;

  if (mapError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center text-red-500 gap-2">
            <AlertCircle className="w-8 h-8" />
            <p>Erro ao carregar o mapa: {mapError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          {(isLoading || !isReady) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}
          
          <div 
            ref={mapRef}
            className="w-full h-[400px] rounded-lg"
            style={{ minHeight: '400px' }}
          />

          {/* Info overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="bg-white rounded-lg shadow-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Origem</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium">Destino</span>
              </div>
              {showDriverLocation && serviceRequest.current_location_lat && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Motorista</span>
                </div>
              )}
            </div>

            {serviceRequest.current_eta_minutes && (
              <div className="bg-blue-600 text-white rounded-lg shadow-lg p-3">
                <div className="text-xs opacity-90">ETA</div>
                <div className="text-2xl font-bold">{serviceRequest.current_eta_minutes}min</div>
              </div>
            )}
          </div>

          {/* Status do rastreamento */}
          {serviceRequest.location_last_updated_at && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white rounded-lg shadow-lg p-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">
                    Última atualização: {new Date(serviceRequest.location_last_updated_at).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Rastreamento Ativo
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}