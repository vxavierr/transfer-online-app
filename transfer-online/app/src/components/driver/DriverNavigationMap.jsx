import React, { useEffect, useRef, useState } from 'react';
import { useGoogleMapsReady } from '@/components/booking/GoogleMapsLoader';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, X, Minus, Plus, Locate, ArrowRight, CornerUpRight, CornerUpLeft, ArrowUp, Volume2, VolumeX } from 'lucide-react';

export default function DriverNavigationMap({ 
  origin, 
  destination, 
  driverLocation, 
  onClose 
}) {
  const { isReady } = useGoogleMapsReady();
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [driverMarker, setDriverMarker] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // { duration, distance, steps }
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [nextManeuver, setNextManeuver] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [directionsResult, setDirectionsResult] = useState(null);
  const lastRecalculationRef = useRef(0);
  const [mapError, setMapError] = useState(null);
  const [waitingForGPS, setWaitingForGPS] = useState(false);
  const [showOpenInBrowserHint, setShowOpenInBrowserHint] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const wakeLockRef = useRef(null);
  
  // Refs para animação
  const driverMarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastLocationRef = useRef(driverLocation);
  const isFollowingRef = useRef(isFollowing);
  
  // Detectar se está em webview (WhatsApp, Instagram, etc)
  const isInAppBrowser = React.useMemo(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return ua.includes('Instagram') || ua.includes('FBAN') || ua.includes('FBAV') || 
           ua.includes('WhatsApp') || ua.includes('LinkedIn') || ua.includes('Snapchat');
  }, []);

  // Wake Lock - Manter tela ligada
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock is active');
          
          wakeLockRef.current.addEventListener('release', () => {
            console.log('Wake Lock was released');
          });
        }
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Text to Speech logic
  const speakInstruction = (text) => {
    if (isMuted || !window.speechSynthesis) return;
    
    // Cancelar falas anteriores
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; // Um pouco mais rápido que o normal
    utterance.pitch = 1.0;
    
    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Erro ao reproduzir voz:', err);
    }
  };

  // Atualizar ref de following para uso no loop de animação
  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  // Reset waitingForGPS when location is received
  useEffect(() => {
    if (driverLocation && typeof driverLocation.lat === 'number' && !isNaN(driverLocation.lat)) {
      setWaitingForGPS(false);
      setShowOpenInBrowserHint(false);
    }
  }, [driverLocation]);

  // Initialize Map
  useEffect(() => {
    if (isReady && mapRef.current && !mapInstance) {
      try {
        // Validar coordenadas do motorista
        const hasValidDriverLocation = driverLocation && 
                                       typeof driverLocation.lat === 'number' && 
                                       typeof driverLocation.lng === 'number' &&
                                       !isNaN(driverLocation.lat) &&
                                       !isNaN(driverLocation.lng);

        const centerPosition = hasValidDriverLocation 
          ? { lat: driverLocation.lat, lng: driverLocation.lng }
          : { lat: -23.550520, lng: -46.633308 };

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 18,
          center: centerPosition,
          disableDefaultUI: true,
          backgroundColor: '#f3f4f6',
          heading: driverLocation?.heading || 0,
          tilt: 45, // Adicionar inclinação para visualização 3D
          gestureHandling: 'greedy', // Melhora interação em mobile
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] }
          ]
        });

        const renderer = new window.google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true,
          preserveViewport: true,
          suppressInfoWindows: true,
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 10, // Thicker line
            strokeOpacity: 1.0 // Solid color
          }
        });

        setMapInstance(map);
        setDirectionsRenderer(renderer);

        // Listen for drag to disable auto-follow
        map.addListener('dragstart', () => setIsFollowing(false));

        // Se não tem localização válida, mostrar alerta após 3s
        if (!hasValidDriverLocation) {
          setWaitingForGPS(true);
          setTimeout(() => {
            if (!driverLocation || isNaN(driverLocation?.lat)) {
              setShowOpenInBrowserHint(true);
            }
          }, 3000);
        }
      } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        setMapError('Erro ao carregar mapa. Tente novamente.');
      }
    }
  }, [isReady, mapRef, mapInstance, driverLocation]);

  // Helper para calcular heading entre dois pontos
  const computeHeading = (lat1, lng1, lat2, lng2) => {
      const toRad = (deg) => deg * Math.PI / 180;
      const toDeg = (rad) => rad * 180 / Math.PI;
      
      const dLng = toRad(lng2 - lng1);
      const y = Math.sin(dLng) * Math.cos(toRad(lat2));
      const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
                Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
      const heading = toDeg(Math.atan2(y, x));
      return (heading + 360) % 360;
  };

  // Update Driver Marker with Smooth Interpolation
  useEffect(() => {
    // Só atualizar marcador se tiver localização válida
    if (!mapInstance || !driverLocation) return;
    
    // Validar coordenadas
    if (!driverLocation.lat || !driverLocation.lng || 
        isNaN(driverLocation.lat) || isNaN(driverLocation.lng)) {
      console.warn('Invalid driver location:', driverLocation);
      return;
    }

    // Calcular heading se não vier do GPS (baseado na posição anterior)
    let calculatedHeading = driverLocation.heading;
    if ((calculatedHeading === undefined || calculatedHeading === null || isNaN(calculatedHeading)) && lastLocationRef.current) {
        const dist = window.google.maps.geometry.spherical.computeDistanceBetween(
            new window.google.maps.LatLng(lastLocationRef.current.lat, lastLocationRef.current.lng),
            new window.google.maps.LatLng(driverLocation.lat, driverLocation.lng)
        );
        // Só recalcular heading se houve movimento significativo (> 2 metros) para evitar jitter
        if (dist > 2) {
            calculatedHeading = computeHeading(
                lastLocationRef.current.lat, 
                lastLocationRef.current.lng, 
                driverLocation.lat, 
                driverLocation.lng
            );
        } else {
            calculatedHeading = lastLocationRef.current.heading || 0;
        }
    }
    
    // Se ainda não tiver heading, manter 0
    if (calculatedHeading === undefined || calculatedHeading === null) calculatedHeading = 0;

    // 1. Criar marcador se não existir
    if (!driverMarkerRef.current) {
      // Car Icon SVG Path (Simplified top-down view)
      const carPath = "M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.417,10.773,11.3,7.755,20.625,10.773z M3.425,14.188v11.665l2.729,0.351v-4.806 L3.425,14.188z M22.057,41.388c0,0.544-0.443,0.989-0.988,0.989H4.414c-0.544,0-0.988-0.444-0.988-0.989V26.91h19.631V41.388z";

      const marker = new window.google.maps.Marker({
      position: { lat: driverLocation.lat, lng: driverLocation.lng },
      map: mapInstance,
      icon: {
        path: carPath,
        scale: 0.7,
        fillColor: "#4285F4", // Google Blue
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: "#ffffff",
        rotation: calculatedHeading,
        anchor: new window.google.maps.Point(11.5, 23.5) // Center of the car
      },
      zIndex: 1000
      });
      setDriverMarker(marker);
      driverMarkerRef.current = marker;
      lastLocationRef.current = { ...driverLocation, heading: calculatedHeading };
      
      if (isFollowingRef.current) {
        mapInstance.panTo({ lat: driverLocation.lat, lng: driverLocation.lng });
      }
      return;
    }

    // 2. Configurar animação
    // Cancelar animação anterior
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Ponto de partida (onde o marcador está AGORA)
    const currentPos = driverMarkerRef.current.getPosition();
    const currentIcon = driverMarkerRef.current.getIcon();
    
    const startLat = currentPos.lat();
    const startLng = currentPos.lng();
    const startHeading = currentIcon ? (currentIcon.rotation || 0) : 0;

    // Ponto de destino
    const targetLat = driverLocation.lat;
    const targetLng = driverLocation.lng;
    const targetHeading = calculatedHeading;

    // Calcular duração baseada na distância (para manter velocidade consistente ou fixo)
    const duration = 1000; 
    let startTime = null;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Interpolação Linear para Posição
      const lat = startLat + (targetLat - startLat) * progress;
      const lng = startLng + (targetLng - startLng) * progress;
      const newPos = { lat, lng };

      // Interpolação para Rotação (menor caminho)
      let diff = targetHeading - startHeading;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      
      const heading = startHeading + diff * progress;

      // Atualizar Marcador
      driverMarkerRef.current.setPosition(newPos);
      
      const icon = driverMarkerRef.current.getIcon();
      if (icon) {
        icon.rotation = heading;
        driverMarkerRef.current.setIcon(icon);
      }

      // Seguir câmera se ativado
      if (isFollowingRef.current) {
        mapInstance.panTo(newPos);
      }

      // Continuar ou finalizar
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        lastLocationRef.current = { ...driverLocation, heading: targetHeading };
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [driverLocation, mapInstance]); // Depender apenas de driverLocation para triggerar nova animação

  // Determine current step based on location
  useEffect(() => {
    if (!driverLocation || !routeInfo?.steps || !window.google.maps.geometry) return;

    const driverLatLng = new window.google.maps.LatLng(driverLocation.lat, driverLocation.lng);
    
    // Find the closest step
    let closestStepIndex = currentStepIndex;
    let minDistance = Infinity;

    // Search window: check current, previous, and next few steps to avoid scanning whole route
    const searchStart = Math.max(0, currentStepIndex - 1);
    const searchEnd = Math.min(routeInfo.steps.length, currentStepIndex + 3);

    for (let i = searchStart; i < searchEnd; i++) {
        const step = routeInfo.steps[i];
        // Calculate distance from driver to the start of this step
        const distanceToStepStart = window.google.maps.geometry.spherical.computeDistanceBetween(
            driverLatLng,
            step.start_location
        );
        
        // Also check distance to end of step to see if we completed it
        const distanceToStepEnd = window.google.maps.geometry.spherical.computeDistanceBetween(
            driverLatLng,
            step.end_location
        );

        // Simple heuristic: if we are very close to step end, move to next
        if (distanceToStepEnd < 30) { // 30 meters tolerance
            closestStepIndex = i + 1;
            break; 
        }

        // Or just find the step line we are closest to (simplified)
        if (distanceToStepStart < minDistance) {
            minDistance = distanceToStepStart;
            // Only update if it's a forward progression or close enough
            if (i >= currentStepIndex) closestStepIndex = i;
        }
    }

    if (closestStepIndex < routeInfo.steps.length && closestStepIndex !== currentStepIndex) {
        setCurrentStepIndex(closestStepIndex);
        const nextStep = routeInfo.steps[closestStepIndex];
        setNextManeuver(nextStep);
        
        // Falar a instrução quando mudar o passo
        const instructionText = getInstructionText(nextStep.instructions);
        const distanceText = nextStep.distance?.text || "";
        // Speak: "Em 200 metros, vire à direita na Rua X"
        const speakText = `Em ${distanceText}, ${instructionText}`;
        speakInstruction(speakText);

    } else if (closestStepIndex >= routeInfo.steps.length && currentStepIndex < routeInfo.steps.length) {
        // Arrived?
        setCurrentStepIndex(routeInfo.steps.length);
        setNextManeuver({ instructions: "Você chegou ao destino", distance: { text: "" } });
        speakInstruction("Você chegou ao destino");
    }

  }, [driverLocation, routeInfo, currentStepIndex]);


  // Function to calculate route
  const calculateRoute = (startLocation) => {
    if (!isReady || !directionsRenderer || !destination) return;
    
    setIsCalculating(true);
    const directionsService = new window.google.maps.DirectionsService();
    
    // Validar se startLocation tem coordenadas válidas
    const hasValidStart = startLocation && 
                         typeof startLocation.lat === 'number' && 
                         typeof startLocation.lng === 'number' &&
                         !isNaN(startLocation.lat) &&
                         !isNaN(startLocation.lng);
    
    const startPoint = hasValidStart 
      ? { lat: startLocation.lat, lng: startLocation.lng } 
      : origin;

    directionsService.route(
      {
        origin: startPoint,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        setIsCalculating(false);
        if (status === window.google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(result);
          setDirectionsResult(result); // Armazenar resultado para verificação de desvio

          const leg = result.routes[0].legs[0];
          
          setRouteInfo({
            distance: leg.distance,
            duration: leg.duration,
            steps: leg.steps,
            end_address: leg.end_address
          });
          
          if (leg.steps.length > 0) {
              // Só atualizar a próxima manobra se for o cálculo inicial ou recálculo total
              // Se já estivermos navegando, o useEffect de passos cuida disso, mas no recálculo é bom resetar ou ajustar
              setNextManeuver(leg.steps[0]);
              setCurrentStepIndex(0);
          }

          // Destination Marker (apenas se não existir)
          // (Simplificação: o renderer já pode lidar com marcadores se configurado, mas estamos suprimindo e fazendo custom)
        } else {
          console.error(`Directions request failed: ${status}`);
        }
      }
    );
  };

  // Initial Route Calculation
  useEffect(() => {
    const hasValidDriverLocation = driverLocation && 
                                  typeof driverLocation.lat === 'number' && 
                                  typeof driverLocation.lng === 'number' &&
                                  !isNaN(driverLocation.lat) &&
                                  !isNaN(driverLocation.lng);
    
    if (isReady && directionsRenderer && destination && !routeInfo && !isCalculating) {
        // Sempre calcular rota, usando origem se não tiver localização do motorista
        calculateRoute(hasValidDriverLocation ? driverLocation : null);
    }
  }, [isReady, directionsRenderer, origin, destination, driverLocation, routeInfo]);

  // Recalculate Route on Deviation
  useEffect(() => {
    if (!driverLocation || !directionsResult || isCalculating || !window.google.maps.geometry) return;
    
    // Validar coordenadas
    if (!driverLocation.lat || !driverLocation.lng || 
        isNaN(driverLocation.lat) || isNaN(driverLocation.lng)) {
      return;
    }
    
    const now = Date.now();
    // Throttle de 5 segundos para recálculo
    if (now - lastRecalculationRef.current < 5000) return;

    const route = directionsResult.routes[0];
    if (!route || !route.overview_path) return;

    const driverLatLng = new window.google.maps.LatLng(driverLocation.lat, driverLocation.lng);
    
    // Criar Polyline temporária para verificação geométrica
    const polyline = new window.google.maps.Polyline({
        path: route.overview_path
    });

    // Tolerância: ~30-40 metros (aprox 4e-4 graus)
    // isLocationOnEdge retorna true se o ponto estiver dentro da tolerância da linha
    const isOnRoute = window.google.maps.geometry.poly.isLocationOnEdge(
        driverLatLng,
        polyline,
        4e-4 
    );
    
    if (!isOnRoute) {
        console.log("⚠️ Motorista fora da rota! Recalculando...");
        lastRecalculationRef.current = now;
        calculateRoute(driverLocation);
    }
  }, [driverLocation, directionsResult]);

  // Helper to parse instruction html to text
  const getInstructionText = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    // Use innerText first for better spacing preservation
    return div.innerText || div.textContent || "";
  };

  const getManeuverIcon = (htmlInstruction) => {
      const text = getInstructionText(htmlInstruction).toLowerCase();
      if (text.includes('esquerda')) return <CornerUpLeft className="w-10 h-10 text-white" />;
      if (text.includes('direita')) return <CornerUpRight className="w-10 h-10 text-white" />;
      if (text.includes('retorno') || text.includes('u-turn')) return <Navigation className="w-10 h-10 text-white rotate-180" />;
      return <ArrowUp className="w-10 h-10 text-white" />;
  };

  // Função para abrir no navegador padrão
  const openInBrowser = () => {
    const currentUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ url: currentUrl }).catch(() => {
        alert('Por favor, copie o link e cole no navegador:\n\n' + currentUrl);
      });
    } else {
      alert('Por favor, copie o link e cole no navegador:\n\n' + currentUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col h-[100dvh] w-screen overflow-hidden font-sans">
      
      {/* Alerta para abrir no navegador (webview do WhatsApp) */}
      {showOpenInBrowserHint && isInAppBrowser && (
        <div className="absolute top-4 left-4 right-4 z-50 bg-amber-500 text-white p-4 rounded-lg shadow-2xl">
          <p className="font-bold mb-2">⚠️ GPS não detectado</p>
          <p className="text-sm mb-3">
            Para melhor experiência, abra este link no navegador padrão (Chrome, Safari).
          </p>
          <Button
            onClick={openInBrowser}
            className="w-full bg-white text-amber-600 hover:bg-gray-100 font-bold"
            size="sm"
          >
            Abrir no Navegador
          </Button>
          <button
            onClick={() => setShowOpenInBrowserHint(false)}
            className="absolute top-2 right-2 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Top Navigation Bar (Next Maneuver - Google Maps Style) */}
      <div className="bg-[#2A75F3] p-4 text-white shadow-lg z-20 flex items-start gap-4 m-2 rounded-xl">
        {nextManeuver ? (
            <>
                <div className="flex flex-col items-center justify-center shrink-0 min-w-[60px] pt-1">
                    {/* Ícone de manobra grande e branco */}
                    <div className="transform scale-125">
                        {getManeuverIcon(nextManeuver.instructions)}
                    </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-3xl font-bold leading-none mb-1">
                        {nextManeuver.distance?.text || "0 m"}
                    </div>
                    <div className="text-lg font-medium leading-tight text-white/90 line-clamp-2">
                        {getInstructionText(nextManeuver.instructions)}
                    </div>
                </div>
            </>
        ) : (
            <div className="flex items-center gap-3 w-full justify-center py-2">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="font-medium">Calculando rota...</span>
            </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-30">
            <div className="text-center text-white p-6">
              <X className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <p className="text-xl font-bold mb-2">{mapError}</p>
              <Button onClick={onClose} className="mt-4 bg-blue-600 hover:bg-blue-700">
                Voltar
              </Button>
            </div>
          </div>
        )}

        {waitingForGPS && !driverLocation && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-blue-600/95 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-[90%]">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Aguardando GPS...</span>
          </div>
        )}

        <div ref={mapRef} className="w-full h-full bg-gray-200" />
        
        {/* Map Controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <Button size="icon" className="rounded-full bg-white text-slate-900 shadow-lg hover:bg-gray-50" onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </Button>
            <Button size="icon" className="rounded-full bg-white text-slate-900 shadow-lg hover:bg-gray-50" onClick={() => mapInstance?.setZoom(mapInstance.getZoom() + 1)}>
                <Plus className="w-6 h-6" />
            </Button>
            <Button size="icon" className="rounded-full bg-white text-slate-900 shadow-lg hover:bg-gray-50" onClick={() => mapInstance?.setZoom(mapInstance.getZoom() - 1)}>
                <Minus className="w-6 h-6" />
            </Button>
        </div>

        {/* Recenter Button */}
        {!isFollowing && (
            <div className="absolute bottom-6 right-4 z-10">
                <Button 
                    className="rounded-full bg-white text-blue-600 shadow-lg px-4 py-6 flex flex-col items-center gap-1 hover:bg-gray-50 border-2 border-transparent hover:border-blue-100"
                    onClick={() => setIsFollowing(true)}
                >
                    <Locate className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Recentrar</span>
                </Button>
            </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="bg-white p-4 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20">
        <div className="flex justify-between items-center">
            <div className="flex-1">
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 leading-none">
                    {routeInfo?.duration?.value ? 
                        new Date(Date.now() + routeInfo.duration.value * 1000).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 
                        "--:--"}
                </div>
                <div className="text-sm text-slate-500 font-medium mt-1">
                    Chegada • {routeInfo?.distance?.text || "-- km"}
                </div>
                <div className="text-xs text-slate-400 truncate max-w-[200px]">
                    {routeInfo?.end_address?.split(',')[0] || destination}
                </div>
            </div>
            
            <button
                onClick={onClose}
                className="flex items-center gap-3 group"
                title="Voltar para detalhes da viagem"
            >
                <div className="flex flex-col items-end mr-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voltar para</span>
                    <span className="text-xs font-bold text-blue-600 leading-tight group-hover:text-blue-700">Detalhes da Viagem</span>
                </div>
                <div className="w-14 h-14 rounded-full bg-white shadow-lg group-hover:shadow-xl transition-all overflow-hidden flex-shrink-0 border-2 border-white ring-1 ring-gray-100">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg" 
                        alt="TransferOnline" 
                        className="w-full h-full object-cover"
                    />
                </div>
            </button>
        </div>
      </div>
    </div>
  );
}