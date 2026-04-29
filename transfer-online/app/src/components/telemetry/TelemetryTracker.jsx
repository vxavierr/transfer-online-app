import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { GeoService, isNativePlatform, SensorService } from '@/native';
import TelemetryForeground from '@/native/bridge/TelemetryForegroundBridge';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

/**
 * TelemetryTracker — componente centralizado de GPS e telemetria.
 * 
 * Props:
 * - isTracking: boolean — se deve monitorar GPS
 * - driverId: string — ID do motorista
 * - tripId: string — ID da viagem
 * - tripToken: string — token de acesso da viagem (para updateDriverLocation)
 * - visible: boolean — se mostra a UI (default true)
 * - onLocationUpdate: (location) => void — callback throttled com dados de localização
 * - onGpsStatusChange: (status) => void — callback para status do GPS ('granted'|'denied'|'error')
 */
export default function TelemetryTracker({ 
  isTracking, 
  driverId, 
  tripId, 
  tripToken,
  visible = true, 
  onLocationUpdate, 
  onGpsStatusChange 
}) {
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
  const lastLocationPingRef = useRef(0); // timestamp do último ping de localização para o mapa do admin
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
  
  // Sensor fusion refs
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const accelSamplesRef = useRef([]);
  const lastGyroRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const ACCEL_BUFFER_SIZE = 20; // Rolling window of ~1s at 20Hz (more samples = less noise)
  const HARD_BRAKE_G_THRESHOLD = 0.45; // 0.45g = ~4.4 m/s² — filters road vibration, catches real braking
  const SHARP_TURN_GYRO_THRESHOLD = 45; // 45 deg/s yaw rate — filters normal turns, catches sharp ones
  const INCIDENT_DEBOUNCE_MS = 15000; // 15s between same incident type — prevents spam
  const lastBrakeTimestampRef = useRef(0); // Persistent debounce — survives buffer clears

  // Throttle refs para evitar atualizações excessivas
  const lastLocationCallbackRef = useRef(0);
  const lastBackendUpdateRef = useRef(0);
  const LOCATION_CALLBACK_THROTTLE_MS = 5000; // Notificar UI a cada 5s
  const BACKEND_UPDATE_THROTTLE_MS = 10000; // Enviar para backend a cada 10s
  
  // Monitoramento de celular e limite de velocidade
  const lastInteractionTimeRef = useRef(0);
  const lastSpeedCheckTimeRef = useRef(0);
  const currentSpeedLimitRef = useRef(null);
  
  // Audio element ref for background persistence
  const silentAudioRef = useRef(null);

  // Constants
  const BATCH_INTERVAL = 10000; // 10s — tracking quase real-time
  const DEFAULT_SPEEDING_THRESHOLD_KMH = 110;
  const SILENT_AUDIO_SRC = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAAAMUAAAAA//OEAAABAAAAAgAAAelAYAAAZAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAAAMUAAAAA";
  const HARD_BRAKE_THRESHOLD_KMH_S = 15;     // ~4.17 m/s2 — GPS is imprecise, needs higher threshold
  const HARD_BRAKE_MIN_SPEED_KMH = 25;        // Ignore braking below 25 km/h (traffic, parking)
  const HARD_BRAKE_MAX_INTERVAL_S = 5;         // GPS intervals > 5s dilute too much — discard
  const MOVEMENT_THRESHOLD_KMH = 10;
  const PHONE_USAGE_DEBOUNCE_MS = 10000;
  const SPEED_LIMIT_CHECK_INTERVAL_MS = 30000;
  const SHARP_TURN_THRESHOLD_DEG = 45;         // Degrees between consecutive readings
  const SHARP_TURN_RATE_THRESHOLD_DEG_S = 35;  // Degrees per second — filters normal turns
  const SHARP_TURN_MIN_SPEED_KMH = 20;         // Ignore turns at low speed (manobras)

  // Setup silent audio for background persistence (web only — native uses Foreground Service)
  useEffect(() => {
    if (isNativePlatform()) return;
    if (!silentAudioRef.current) {
      const audio = new Audio(SILENT_AUDIO_SRC);
      audio.loop = true;
      audio.volume = 0.01;
      silentAudioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    if (isTracking && driverId && tripId) {
      startSession();
      playSilentAudio();
    } else if (!isTracking && sessionIdRef.current) {
      endSession();
      pauseSilentAudio();
    }

    return () => {
      if (sessionIdRef.current && isTracking) {
        endSession();
        pauseSilentAudio(); 
      }
    };
  }, [isTracking, driverId, tripId]);

  const playSilentAudio = () => {
    if (isNativePlatform()) return;
    if (silentAudioRef.current) {
      silentAudioRef.current.play().catch(e => console.warn("Background audio start failed:", e));
    }
  };

  const pauseSilentAudio = () => {
    if (isNativePlatform()) return;
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current.currentTime = 0;
    }
  };

  // Re-request Wake Lock when app becomes visible again
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
    // On native, the Foreground Service holds a PARTIAL_WAKE_LOCK — skip here
    if (isNativePlatform()) return;
    try {
      if (navigator.wakeLock) {
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

  // Native Foreground Service bridge (Capacitor plugin)
  const toggleNativeForegroundService = async (isActive) => {
    if (!TelemetryForeground) return;
    try {
      if (isActive) {
        await TelemetryForeground.start({
          driverId: driverId || '',
          sessionId: sessionIdRef.current || '',
          sendIntervalMs: BATCH_INTERVAL
        });
      } else {
        await TelemetryForeground.stop();
      }
    } catch (err) {
      console.warn('TelemetryForeground plugin error:', err);
    }
  };

  // Expose global function for Native App to push location updates directly
  useEffect(() => {
    window.updateTelemetryLocation = (lat, lon, speed, heading, timestamp) => {
      const position = {
        coords: {
          latitude: Number(lat),
          longitude: Number(lon),
          speed: Number(speed),
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

  // Monitorar uso de celular enquanto em movimento
  useEffect(() => {
    if (!isTracking) return;

    const handleInteraction = () => {
      const now = Date.now();
      if (stats.speed > MOVEMENT_THRESHOLD_KMH && (now - lastInteractionTimeRef.current > PHONE_USAGE_DEBOUNCE_MS)) {
        lastInteractionTimeRef.current = now;
        statsRef.current.phoneUsage++;
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
        SensorService.start((data) => {
          lastAccelRef.current = data.acceleration;
          lastGyroRef.current = data.rotationRate;

          // Rolling buffer for averaging (reduces noise)
          accelSamplesRef.current.push(data.acceleration);
          if (accelSamplesRef.current.length > ACCEL_BUFFER_SIZE) {
            accelSamplesRef.current.shift();
          }
        }).catch(err => console.warn('[TelemetryTracker] Sensor start failed:', err));
      }
    } catch (err) {
      console.error('Telemetry start error:', err);
      setStatus('error');
    }
  };

  const endSession = async () => {
    stopGPSMonitoring();
    SensorService.stop();
    accelSamplesRef.current = [];
    releaseWakeLock();
    toggleNativeForegroundService(false);
    await uploadBatch();
    
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
    statsRef.current = { maxSpeed: 0, distanceKm: 0, accumulatedSpeed: 0, speedSamples: 0, hardBrakes: 0, speedingEvents: 0, sharpTurns: 0, phoneUsage: 0 };
    setStats({ speed: 0, maxSpeed: 0, distanceKm: 0, events: 0 });
  };

  const startGPSMonitoring = async () => {
    // Pedir permissão antes de qualquer uso de GPS (iOS requer isso explicitamente)
    const permStatus = await GeoService.requestPermission();
    if (permStatus === 'denied') {
      onGpsStatusChange?.('denied');
      return;
    }

    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

    try {
      let id;
      if (!TelemetryForeground) {
        // iOS: usar background tracking (CLLocationManager com allowsBackgroundLocationUpdates)
        await GeoService.requestBackgroundPermission();
        id = await GeoService.startBackgroundTracking(handlePositionUpdate, {
          backgroundMessage: 'Rastreando sua localização durante a viagem',
          backgroundTitle: 'Transfer Online',
          distanceFilter: 5,
        });
      } else {
        // Android: TelemetryForeground cuida do background; watchPosition é fallback
        id = await GeoService.watchPosition(
          handlePositionUpdate,
          (err) => {
            console.warn('[TelemetryTracker] GPS Error:', err);
            if (err.code === 1) onGpsStatusChange?.('denied');
          },
          options
        );
      }
      watchIdRef.current = id;
      onGpsStatusChange?.('granted');
    } catch (err) {
      console.error('[TelemetryTracker] Failed to start GPS:', err);
      onGpsStatusChange?.('error');
    }
  };

  const stopGPSMonitoring = () => {
    if (watchIdRef.current !== null) {
      if (!TelemetryForeground) {
        GeoService.stopBackgroundTracking(watchIdRef.current);
      } else {
        GeoService.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
  };

  const handlePositionUpdate = useCallback((position) => {
    const { latitude, longitude, speed: speedMps, heading, accuracy } = position.coords;
    const posTimestamp = position.timestamp || position.coords.timestamp || Date.now();
    const now = Date.now();

    if (accuracy && accuracy > 100) return; // Rejeitar GPS com acurácia ruim (100m aceita primeiro fix iOS ~65m)
    
    // Convert m/s to km/h
    const currentSpeedKmh = (speedMps || 0) * 3.6;
    if (currentSpeedKmh > 200) return; // Descartar velocidades impossíveis (GPS jitter)

    // Update Stats
    if (currentSpeedKmh > statsRef.current.maxSpeed) {
      statsRef.current.maxSpeed = currentSpeedKmh;
    }
    statsRef.current.accumulatedSpeed += currentSpeedKmh;
    statsRef.current.speedSamples++;

    // Calculate distance & detect events
    if (lastPositionRef.current) {
      // Detect Sharp Turn — prefer gyroscope if available, fallback to GPS heading
      const gyroYawRate = Math.abs(lastGyroRef.current.alpha);

      if (gyroYawRate > SHARP_TURN_GYRO_THRESHOLD && currentSpeedKmh > SHARP_TURN_MIN_SPEED_KMH) {
        const lastTurnTime = eventBufferRef.current.findLast(e => e.type === 'sharp_turn')?.timestamp;
        const timeSinceLastTurn = lastTurnTime ? (Date.now() - new Date(lastTurnTime)) : 99999;

        if (timeSinceLastTurn > INCIDENT_DEBOUNCE_MS) {
          statsRef.current.sharpTurns++;
          logEvent('sharp_turn', latitude, longitude, currentSpeedKmh, gyroYawRate,
            JSON.stringify({ source: 'gyroscope', yawRate: gyroYawRate.toFixed(1) }));
        }
      } else if (currentSpeedKmh > SHARP_TURN_MIN_SPEED_KMH
          && heading != null && !isNaN(heading) && heading >= 0
          && lastPositionRef.current.heading != null && !isNaN(lastPositionRef.current.heading) && lastPositionRef.current.heading >= 0) {
        // GPS heading fallback
        let headingDiff = Math.abs(heading - lastPositionRef.current.heading);
        if (headingDiff > 180) headingDiff = 360 - headingDiff;
        const timeDiffS = (posTimestamp - lastPositionRef.current.timestamp) / 1000;

        if (timeDiffS > 0 && timeDiffS < 10) {
          const turnRate = headingDiff / timeDiffS;
          if (headingDiff > SHARP_TURN_THRESHOLD_DEG && turnRate > SHARP_TURN_RATE_THRESHOLD_DEG_S) {
            const lastTurnTime = eventBufferRef.current.findLast(e => e.type === 'sharp_turn')?.timestamp;
            const timeSinceLastTurn = lastTurnTime ? (Date.now() - new Date(lastTurnTime)) : 99999;
            if (timeSinceLastTurn > INCIDENT_DEBOUNCE_MS) {
              statsRef.current.sharpTurns++;
              logEvent('sharp_turn', latitude, longitude, currentSpeedKmh, headingDiff,
                JSON.stringify({ source: 'gps', headingDiff, turnRate: turnRate.toFixed(1) }));
            }
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
      
      // Detect Hard Brake — prefer accelerometer if available, fallback to GPS delta
      const timeDiffSeconds = (posTimestamp - lastPositionRef.current.timestamp) / 1000;

      // Debounce: only detect braking if last brake event was > 15s ago
      const timeSinceLastBrake = now - lastBrakeTimestampRef.current;

      if (timeSinceLastBrake > INCIDENT_DEBOUNCE_MS) {
        if (accelSamplesRef.current.length >= 5) {
          // Sensor-based: average Y-axis acceleration (longitudinal = braking)
          const avgY = accelSamplesRef.current.reduce((sum, s) => sum + s.y, 0) / accelSamplesRef.current.length;
          const gForce = Math.abs(avgY) / 9.81;

          if (gForce > HARD_BRAKE_G_THRESHOLD && currentSpeedKmh > HARD_BRAKE_MIN_SPEED_KMH) {
            statsRef.current.hardBrakes++;
            logEvent('hard_brake', latitude, longitude, currentSpeedKmh, gForce,
              JSON.stringify({ source: 'accelerometer', gForce: gForce.toFixed(3) }));
            lastBrakeTimestampRef.current = now;
          }
        } else if (timeDiffSeconds > 0 && timeDiffSeconds < HARD_BRAKE_MAX_INTERVAL_S) {
          // GPS fallback
          if (lastPositionRef.current.speed > HARD_BRAKE_MIN_SPEED_KMH) {
            const speedDiff = lastPositionRef.current.speed - currentSpeedKmh;
            const deceleration = speedDiff / timeDiffSeconds;
            if (deceleration > HARD_BRAKE_THRESHOLD_KMH_S) {
              statsRef.current.hardBrakes++;
              logEvent('hard_brake', latitude, longitude, currentSpeedKmh, deceleration,
                JSON.stringify({ source: 'gps' }));
              lastBrakeTimestampRef.current = now;
            }
          }
        }
      }
    }

    // Check Speed Limit
    if (currentSpeedKmh > 40 && (now - lastSpeedCheckTimeRef.current > SPEED_LIMIT_CHECK_INTERVAL_MS)) {
      lastSpeedCheckTimeRef.current = now;
      base44.functions.invoke('telemetry', {
        action: 'checkSpeedLimit',
        latitude,
        longitude
      }).then(res => {
        if (res.data?.success && res.data?.limit) {
          currentSpeedLimitRef.current = res.data.limit;
        } else {
          currentSpeedLimitRef.current = null;
        }
      }).catch(err => console.warn('Speed limit check failed', err));
    }

    // Detect Speeding
    const limit = currentSpeedLimitRef.current || DEFAULT_SPEEDING_THRESHOLD_KMH;
    const tolerance = Math.max(10, limit * 0.1); 
    
    if (currentSpeedKmh > (limit + tolerance)) {
      const lastEvent = eventBufferRef.current[eventBufferRef.current.length - 1];
      const isRecent = lastEvent && lastEvent.type === 'speeding' && (now - new Date(lastEvent.timestamp)) < 10000;
      
      if (!isRecent) {
        statsRef.current.speedingEvents++;
        logEvent('speeding', latitude, longitude, currentSpeedKmh, currentSpeedKmh - limit, JSON.stringify({ limit, actual: currentSpeedKmh }));
      }
    }

    // Periodic location log (breadcrumbs para reconstrução de rota)
    const lastLog = eventBufferRef.current.findLast(e => e.type === 'location_update');
    const timeSinceLastLog = lastLog ? (now - new Date(lastLog.timestamp)) : 99999;
    
    if (timeSinceLastLog > 10000) {
      logEvent('location_update', latitude, longitude, currentSpeedKmh);
    }

    lastPositionRef.current = { latitude, longitude, speed: currentSpeedKmh, heading, timestamp: posTimestamp };
    
    // ===== THROTTLED: Notificar UI via callback =====
    if (onLocationUpdate && (now - lastLocationCallbackRef.current > LOCATION_CALLBACK_THROTTLE_MS)) {
      lastLocationCallbackRef.current = now;
      onLocationUpdate({
        latitude,
        longitude,
        speed: currentSpeedKmh,
        heading,
        timestamp: new Date().toISOString()
      });
    }

    // ===== THROTTLED: Enviar para backend (updateDriverLocation) =====
    if (tripToken && (now - lastBackendUpdateRef.current > BACKEND_UPDATE_THROTTLE_MS)) {
      lastBackendUpdateRef.current = now;
      base44.functions.invoke('updateDriverLocation', {
        serviceRequestId: tripId,
        token: tripToken,
        latitude,
        longitude,
        speed: currentSpeedKmh,
        heading
      }).catch(err => console.warn('[TelemetryTracker] Backend sync error:', err));
    }

    // Update UI state (only speed/distance for the small telemetry badge)
    setStats({
      speed: Math.round(currentSpeedKmh),
      maxSpeed: Math.round(statsRef.current.maxSpeed),
      distanceKm: statsRef.current.distanceKm.toFixed(1),
      events: eventBufferRef.current.length
    });

    // Force immediate upload for first valid location
    if (!hasSentFirstLocationRef.current && latitude !== 0 && longitude !== 0) {
      hasSentFirstLocationRef.current = true;
      uploadBatch();
    }
  }, [tripToken, tripId, onLocationUpdate, onGpsStatusChange]);

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
    eventBufferRef.current = [];

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
      // Restaurar eventos para não perder dados
      eventBufferRef.current = [...eventsToSend, ...eventBufferRef.current];
    }
  };

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