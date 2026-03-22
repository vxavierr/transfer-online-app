import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import GeoService from '@/native/services/GeoService';

export default function TelemetryTracker({ isTracking, driverId, tripId, visible = true }) {
  const [status, setStatus] = useState('idle'); // idle, active, error
  const [stats, setStats] = useState({
    speed: 0,
    maxSpeed: 0,
    distanceKm: 0,
    events: 0
  });

  const sessionIdRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const wakeLockRef = useRef(null);
  const eventBufferRef = useRef([]);
  const hasSentFirstLocationRef = useRef(false);
  const statsRef = useRef({
    maxSpeed: 0,
    distanceKm: 0,
    accumulatedSpeed: 0,
    speedSamples: 0,
    hardBrakes: 0,
    speedingEvents: 0,
    sharpTurns: 0,
    phoneUsage: 0
  });
  
  // Monitoramento de celular e limite de velocidade
  const lastInteractionTimeRef = useRef(0);
  const lastSpeedCheckTimeRef = useRef(0);
  const currentSpeedLimitRef = useRef(null);
  
  // Audio element ref for background persistence
  const silentAudioRef = useRef(null);

  // Constants
  const BATCH_INTERVAL = 30000; // 30 seconds
  const DEFAULT_SPEEDING_THRESHOLD_KMH = 110; // Fallback threshold
  // Tiny silent mp3 to keep app alive in background
  const SILENT_AUDIO_SRC = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAAAMUAAAAA//OEAAABAAAAAgAAAelAYAAAZAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAAAMUAAAAA";
  const HARD_BRAKE_THRESHOLD_KMH_S = 15; // Deceleration > 15 km/h per second
  const MOVEMENT_THRESHOLD_KMH = 10; // Considera movimento acima de 10km/h
  const PHONE_USAGE_DEBOUNCE_MS = 10000; // Logar uso de celular no máximo a cada 10s
  const SPEED_LIMIT_CHECK_INTERVAL_MS = 30000; // Checar limite da via a cada 30s se estiver rápido
  const SHARP_TURN_THRESHOLD_DEG = 45; // Curva > 45 graus
  const SHARP_TURN_MIN_SPEED_KMH = 20; // Velocidade mínima para considerar curva perigosa

  // Setup silent audio for background persistence
  useEffect(() => {
    if (!silentAudioRef.current) {
      const audio = new Audio(SILENT_AUDIO_SRC);
      audio.loop = true;
      audio.volume = 0.01; // Quase mudo, mas não zero (alguns browsers pausam se vol for 0)
      silentAudioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    if (isTracking && driverId && tripId) {
      startSession();
      // Tentar iniciar o áudio (requer interação do usuário antes, geralmente o clique em "Iniciar Viagem" serve)
      playSilentAudio();
    } else if (!isTracking && sessionIdRef.current) {
      endSession();
      pauseSilentAudio();
    }

    return () => {
      if (sessionIdRef.current && isTracking) {
        // Emergency cleanup if component unmounts while tracking
        endSession();
        pauseSilentAudio(); 
      }
    };
  }, [isTracking, driverId, tripId]);

  const playSilentAudio = () => {
    if (silentAudioRef.current) {
      silentAudioRef.current.play().catch(e => console.warn("Background audio start failed (interaction needed?):", e));
    }
  };

  const pauseSilentAudio = () => {
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current.currentTime = 0;
    }
  };

  // Re-request Wake Lock when app becomes visible again (if it was dropped)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'active') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Wake Lock release error:', err);
      }
    }
  };

  // Background tracking é gerenciado pelo GeoService via @capacitor-community/background-geolocation
  // O plugin já cria uma notificação foreground automaticamente no Android
  const toggleNativeForegroundService = (isActive) => {
    console.log('[Telemetry] Background tracking:', isActive ? 'active' : 'inactive');
  };

  // Expose global function for Native App to push location updates directly (Robust Background Tracking)
  useEffect(() => {
    window.updateTelemetryLocation = (lat, lon, speed, heading, timestamp) => {
      // Native apps usually send speed in m/s. If sending km/h, adjustments might be needed native-side or here.
      // We assume the native side sends standard GPS data (m/s).
      const position = {
        coords: {
          latitude: Number(lat),
          longitude: Number(lon),
          speed: Number(speed), // Expected in m/s
          heading: Number(heading),
          timestamp: timestamp || Date.now()
        },
        timestamp: timestamp || Date.now()
      };
      handlePositionUpdate(position);
    };

    return () => {
      delete window.updateTelemetryLocation;
    };
  }, []);

  // Monitorar uso de celular (toques na tela) enquanto em movimento
  useEffect(() => {
    if (!isTracking) return;

    const handleInteraction = () => {
        const now = Date.now();
        // Se estiver em movimento e passou tempo suficiente desde último log
        if (stats.speed > MOVEMENT_THRESHOLD_KMH && (now - lastInteractionTimeRef.current > PHONE_USAGE_DEBOUNCE_MS)) {
            lastInteractionTimeRef.current = now;
            statsRef.current.phoneUsage++; // Increment count
            logEvent('phone_usage', lastPositionRef.current?.latitude || 0, lastPositionRef.current?.longitude || 0, stats.speed, 1, JSON.stringify({ reason: 'touch_interaction' }));
        }
    };

    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('click', handleInteraction);
    
    return () => {
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('click', handleInteraction);
    };
  }, [isTracking, stats.speed]);

  // Batch uploader interval
  useEffect(() => {
    let interval;
    if (status === 'active') {
      interval = setInterval(uploadBatch, BATCH_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [status]);

  const startSession = async () => {
    try {
      const res = await base44.functions.invoke('telemetry', {
        action: 'initSession',
        driverId,
        tripId
      });
      
      if (res.data.success) {
        sessionIdRef.current = res.data.sessionId;
        setStatus('active');
        requestWakeLock();
        toggleNativeForegroundService(true);
        startGPSMonitoring();
      }
    } catch (err) {
      console.error('Telemetry start error:', err);
      setStatus('error');
    }
  };

  const endSession = async () => {
    stopGPSMonitoring();
    releaseWakeLock();
    toggleNativeForegroundService(false);
    await uploadBatch(); // Send remaining
    
    if (sessionIdRef.current) {
      try {
        await base44.functions.invoke('telemetry', {
          action: 'finalizeSession',
          sessionId: sessionIdRef.current,
          finalStats: {
            maxSpeed: statsRef.current.maxSpeed,
            distanceKm: statsRef.current.distanceKm,
            avgSpeed: statsRef.current.speedSamples > 0 ? (statsRef.current.accumulatedSpeed / statsRef.current.speedSamples) : 0
          }
        });
      } catch (err) {
        console.error('Telemetry finalize error:', err);
      }
    }
    
    sessionIdRef.current = null;
    setStatus('idle');
    // Reset stats
    statsRef.current = { maxSpeed: 0, distanceKm: 0, accumulatedSpeed: 0, speedSamples: 0, hardBrakes: 0, speedingEvents: 0, sharpTurns: 0, phoneUsage: 0 };
    setStats({ speed: 0, maxSpeed: 0, distanceKm: 0, events: 0 });
  };

  const startGPSMonitoring = async () => {
    try {
      await GeoService.requestPermission();

      watchIdRef.current = await GeoService.startBackgroundTracking(
        (location) => {
          // Normalizar formato: background plugin retorna flat, watchPosition retorna {coords}
          let position;
          if (location.coords) {
            // Standard Web API (fallback watchPosition)
            position = location;
          } else {
            // @capacitor-community/background-geolocation format
            position = {
              coords: {
                latitude: location.latitude,
                longitude: location.longitude,
                speed: location.speed,
                heading: location.bearing ?? null,
              },
              timestamp: location.time || Date.now(),
            };
          }
          handlePositionUpdate(position);
        },
        {
          backgroundMessage: 'Rastreando viagem em andamento',
          backgroundTitle: 'Transfer Online - Telemetria',
          distanceFilter: 10,
        }
      );
    } catch (err) {
      console.warn('[TelemetryTracker] GPS start error:', err);
      setStatus('error');
    }
  };

  const stopGPSMonitoring = async () => {
    if (watchIdRef.current !== null) {
      await GeoService.stopBackgroundTracking(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handlePositionUpdate = (position) => {
    const { latitude, longitude, speed: speedMps } = position.coords;
    // timestamp fica em position.timestamp, NÃO em position.coords
    const posTimestamp = position.timestamp || Date.now();

    // Convert m/s to km/h (speed can be null)
    const currentSpeedKmh = (speedMps || 0) * 3.6;
    const now = new Date();

    // Update Stats
    if (currentSpeedKmh > statsRef.current.maxSpeed) {
      statsRef.current.maxSpeed = currentSpeedKmh;
    }
    statsRef.current.accumulatedSpeed += currentSpeedKmh;
    statsRef.current.speedSamples++;

    // Calculate distance
    if (lastPositionRef.current) {
      // Detect Sharp Turn
      // Check heading change if speed is significant
      if (currentSpeedKmh > SHARP_TURN_MIN_SPEED_KMH && position.coords.heading !== null && lastPositionRef.current.heading !== null) {
          let headingDiff = Math.abs(position.coords.heading - lastPositionRef.current.heading);
          if (headingDiff > 180) headingDiff = 360 - headingDiff; // Normalize to 0-180
          
          // If changed direction significantly in short time (approx 1 update ~1-5s)
          // Simple heuristic: if diff > threshold
          if (headingDiff > SHARP_TURN_THRESHOLD_DEG) {
              const lastTurnTime = eventBufferRef.current.findLast(e => e.type === 'sharp_turn')?.timestamp;
              const timeSinceLastTurn = lastTurnTime ? (now - new Date(lastTurnTime)) : 99999;
              
              if (timeSinceLastTurn > 5000) { // Debounce turns 5s
                  statsRef.current.sharpTurns++;
                  logEvent('sharp_turn', latitude, longitude, currentSpeedKmh, headingDiff);
              }
          }
      }
      const dist = getDistanceFromLatLonInKm(
        lastPositionRef.current.latitude,
        lastPositionRef.current.longitude,
        latitude,
        longitude
      );
      statsRef.current.distanceKm += dist;
      
      // Detect Hard Brake (GPS-based deceleration)
      const timeDiffSeconds = (posTimestamp - lastPositionRef.current.timestamp) / 1000;
      if (timeDiffSeconds > 0 && timeDiffSeconds < 30) {
        const speedDiff = lastPositionRef.current.speed - currentSpeedKmh;
        const deceleration = speedDiff / timeDiffSeconds; // km/h por segundo
        if (deceleration > HARD_BRAKE_THRESHOLD_KMH_S) {
            statsRef.current.hardBrakes++;
            logEvent('hard_brake', latitude, longitude, currentSpeedKmh, deceleration);
        }
      }
    }

    // Check Speed Limit (Roads API)
    const nowMs = Date.now();
    if (currentSpeedKmh > 40 && (nowMs - lastSpeedCheckTimeRef.current > SPEED_LIMIT_CHECK_INTERVAL_MS)) {
        lastSpeedCheckTimeRef.current = nowMs;
        // Async check - doesn't block
        base44.functions.invoke('telemetry', {
            action: 'checkSpeedLimit',
            latitude,
            longitude
        }).then(res => {
            if (res.data?.success && res.data?.limit) {
                currentSpeedLimitRef.current = res.data.limit;
            } else {
                currentSpeedLimitRef.current = null; // Reset or keep last? Reset safest to avoid false positives on different roads
            }
        }).catch(err => console.warn('Speed limit check failed', err));
    }

    // Detect Speeding
    // Use limit from API if available, otherwise default hard limit
    const limit = currentSpeedLimitRef.current || DEFAULT_SPEEDING_THRESHOLD_KMH;
    // Add 10% tolerance or 10km/h tolerance
    const tolerance = Math.max(10, limit * 0.1); 
    
    if (currentSpeedKmh > (limit + tolerance)) {
       const lastEvent = eventBufferRef.current[eventBufferRef.current.length - 1];
       const isRecent = lastEvent && lastEvent.type === 'speeding' && (now - new Date(lastEvent.timestamp)) < 10000;
       
       if (!isRecent) {
           statsRef.current.speedingEvents++;
           logEvent('speeding', latitude, longitude, currentSpeedKmh, currentSpeedKmh - limit, JSON.stringify({ limit, actual: currentSpeedKmh }));
       }
    }

    // Periodic Location Log (e.g. every 10th update or if distance > 100m - for map reconstruction)
    // For simplicity, just log active location update as an event type 'location_update'
    // but we probably don't want to flood DB.
    // Let's log 'location_update' every 30 seconds approx handled by uploadBatch, 
    // or just buffer strictly relevant events. 
    // Actually user wants "visualização de rotas", so we need breadcrumbs.
    // Let's add a location point every ~100m or 30s.
    const lastLog = eventBufferRef.current.findLast(e => e.type === 'location_update');
    const timeSinceLastLog = lastLog ? (now - new Date(lastLog.timestamp)) : 99999;
    
    if (timeSinceLastLog > 30000) { // Log at least every 30s
         logEvent('location_update', latitude, longitude, currentSpeedKmh);
    }

    lastPositionRef.current = { latitude, longitude, speed: currentSpeedKmh, heading: position.coords.heading, timestamp: posTimestamp };
    
    // Update UI state
    setStats({
        speed: Math.round(currentSpeedKmh),
        maxSpeed: Math.round(statsRef.current.maxSpeed),
        distanceKm: statsRef.current.distanceKm.toFixed(1),
        events: eventBufferRef.current.length
    });

    // Force immediate upload for first valid location to update map quickly
    if (!hasSentFirstLocationRef.current && latitude !== 0 && longitude !== 0) {
        hasSentFirstLocationRef.current = true;
        uploadBatch();
    }
  };

  const logEvent = (type, lat, lon, speed, value = 0, details = null) => {
    eventBufferRef.current.push({
      type,
      latitude: lat,
      longitude: lon,
      speed,
      value,
      details,
      timestamp: new Date().toISOString()
    });
  };

  const uploadBatch = async () => {
    if (!sessionIdRef.current || eventBufferRef.current.length === 0) return;

    const eventsToSend = [...eventBufferRef.current];
    eventBufferRef.current = []; // Clear buffer

    try {
      await base44.functions.invoke('telemetry', {
        action: 'logBatch',
        sessionId: sessionIdRef.current,
        events: eventsToSend,
        currentStats: {
            maxSpeed: statsRef.current.maxSpeed,
            distanceKm: statsRef.current.distanceKm,
            totalHardBrakes: statsRef.current.hardBrakes,
            totalSpeedingEvents: statsRef.current.speedingEvents,
            totalSharpTurns: statsRef.current.sharpTurns
        }
      });
    } catch (err) {
      console.error('Batch upload failed', err);
      // Restore events? For now, risk data loss to avoid complexity (or just retry next time)
    }
  };

  // Helper for distance
  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; 
    var dLat = deg2rad(lat2-lat1);  
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; 
    return d;
  }
  function deg2rad(deg) { return deg * (Math.PI/180) }

  if (!isTracking) return null;
  if (!visible) return null;

  return (
    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="relative">
                <Activity className="w-5 h-5 text-green-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
            </div>
            <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Telemetria Ativa</p>
                <div className="flex gap-3 text-sm font-mono mt-0.5">
                    <span>{stats.speed} km/h</span>
                    <span className="text-slate-500">|</span>
                    <span>{stats.distanceKm} km</span>
                </div>
            </div>
        </div>
        <div>
             {status === 'error' && <Badge variant="destructive">Erro</Badge>}
        </div>
    </div>
  );
}