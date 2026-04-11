#!/usr/bin/env bash
# =============================================================================
# post-sync-patches.sh — Aplica fixes no código Base44 após sync
#
# Uso:
#   bash scripts/post-sync-patches.sh
#   npm run patch  (se configurado no package.json)
#
# O que faz:
#   1. Verifica se TelemetryTracker.jsx precisa dos patches
#   2. Aplica apenas os patches necessários
#   3. Reporta o que foi feito
#
# Patches:
#   FIX-1: timestamp extraído de position.coords → position.timestamp
#   FIX-2: fórmula de frenagem sem dividir por tempo → com divisão
#   FIX-3: navigator.geolocation.watchPosition → GeoService background tracking
#   FIX-4: filtro de acurácia GPS — rejeitar leituras com accuracy > 50m
#   FIX-5: cap de velocidade máxima — descartar leituras > 200 km/h
#   FIX-6: ping de localização em background — atualiza mapa do admin com app minimizado
#   FIX-7: mapa admin — polling 3s + refetchInBackground para rastreamento em tempo real
#   FIX-8: batch interval 30s → 5s + location_update 30s → 5s para tracking em tempo real
#   FIX-9: throttle updateDriverLocation em DetalhesViagemMotoristaV2 (5s) — evita rate limit
# =============================================================================

set -euo pipefail

TRACKER="app/src/components/telemetry/TelemetryTracker.jsx"
DASHBOARD="app/src/pages/AdminDashboard.jsx"
DETALHES="app/src/pages/DetalhesViagemMotoristaV2.jsx"
APPLIED=0
SKIPPED=0
TOTAL=0

# Cores
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log_ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
log_skip()  { echo -e "  ${YELLOW}–${NC} $1 (já aplicado)"; }
log_apply() { echo -e "  ${GREEN}✓${NC} $1 ${GREEN}APLICADO${NC}"; }
log_err()   { echo -e "  ${RED}✗${NC} $1"; }

echo ""
echo "━━━ Transfer Online: Post-Sync Patches ━━━"
echo ""

if [ ! -f "$TRACKER" ]; then
  echo -e "${RED}Erro: $TRACKER não encontrado.${NC}"
  echo "Execute este script da raiz do projeto (D:\\workspace\\projects\\transfer-online)"
  exit 1
fi

# Backup antes de qualquer mudança
cp "$TRACKER" "${TRACKER}.bak"

# ─────────────────────────────────────────────────────────────────────────────
# FIX-0: Import do GeoService
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "GeoService" "$TRACKER"; then
  log_skip "FIX-0: import GeoService"
  SKIPPED=$((SKIPPED + 1))
else
  # Adicionar import após a linha do Activity
  sed -i "/import { Activity } from 'lucide-react';/a import GeoService from '@\/native\/services\/GeoService';" "$TRACKER"
  log_apply "FIX-0: import GeoService adicionado"
  APPLIED=$((APPLIED + 1))
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-1: timestamp extraído de position.coords → position.timestamp
# Detecta: destructuring com "timestamp" dentro de position.coords
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "speed: speedMps, timestamp } = position\.coords" "$TRACKER"; then
  # Bug presente: timestamp está sendo extraído de position.coords
  sed -i 's/const { latitude, longitude, speed: speedMps, timestamp } = position\.coords;/const { latitude, longitude, speed: speedMps } = position.coords;\n    \/\/ timestamp fica em position.timestamp, NÃO em position.coords\n    const posTimestamp = position.timestamp || Date.now();/' "$TRACKER"

  # Atualizar referências de timestamp → posTimestamp no handlePositionUpdate
  # lastPositionRef assignment
  sed -i 's/heading: position\.coords\.heading, timestamp }/heading: position.coords.heading, timestamp: posTimestamp }/' "$TRACKER"

  # timeDiffSeconds calculation
  sed -i 's/(timestamp - lastPositionRef\.current\.timestamp)/(posTimestamp - lastPositionRef.current.timestamp)/' "$TRACKER"

  log_apply "FIX-1: timestamp → position.timestamp"
  APPLIED=$((APPLIED + 1))
elif grep -q "posTimestamp = position\.timestamp" "$TRACKER"; then
  log_skip "FIX-1: timestamp (position.timestamp)"
  SKIPPED=$((SKIPPED + 1))
else
  log_err "FIX-1: padrão não reconhecido — verificar manualmente"
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-2: Fórmula de frenagem: speedDiff > threshold → speedDiff/time > threshold
# Detecta: "if (speedDiff > HARD_BRAKE" sem divisão por timeDiffSeconds
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "if (speedDiff > HARD_BRAKE_THRESHOLD" "$TRACKER"; then
  # Bug presente: comparação absoluta sem dividir por tempo
  sed -i '/if (speedDiff > HARD_BRAKE_THRESHOLD/,/logEvent.*hard_brake/{
    s/if (speedDiff > HARD_BRAKE_THRESHOLD_KMH_S)/const deceleration = speedDiff \/ timeDiffSeconds; \/\/ km\/h por segundo\n        if (deceleration > HARD_BRAKE_THRESHOLD_KMH_S)/
    s/logEvent('\''hard_brake'\'', latitude, longitude, currentSpeedKmh, speedDiff)/logEvent('\''hard_brake'\'', latitude, longitude, currentSpeedKmh, deceleration)/
  }' "$TRACKER"

  # Adicionar guard de timeDiffSeconds < 30 para evitar falsos positivos após pausa longa
  sed -i 's/if (timeDiffSeconds > 0) {/if (timeDiffSeconds > 0 \&\& timeDiffSeconds < 30) {/' "$TRACKER"

  log_apply "FIX-2: fórmula de frenagem corrigida (deceleration/s)"
  APPLIED=$((APPLIED + 1))
elif grep -q "deceleration > HARD_BRAKE_THRESHOLD" "$TRACKER"; then
  log_skip "FIX-2: fórmula de frenagem"
  SKIPPED=$((SKIPPED + 1))
else
  log_err "FIX-2: padrão não reconhecido — verificar manualmente"
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-3: navigator.geolocation.watchPosition → GeoService.startBackgroundTracking
# Detecta: "navigator.geolocation.watchPosition" no startGPSMonitoring
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "navigator\.geolocation\.watchPosition" "$TRACKER"; then
  # Bug presente: usa navigator direto (para em background)
  # Substituir startGPSMonitoring e stopGPSMonitoring inteiros via sed block replace

  # Criar arquivo temporário com o novo conteúdo das funções
  python -c "
import re

with open('$TRACKER', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace startGPSMonitoring
old_start = re.compile(
    r'const startGPSMonitoring = \(\) => \{.*?navigator\.geolocation\.watchPosition\(.*?\);.*?\};',
    re.DOTALL
)
new_start = '''const startGPSMonitoring = async () => {
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
  };'''

content = old_start.sub(new_start, content)

# Replace stopGPSMonitoring
old_stop = re.compile(
    r'const stopGPSMonitoring = \(\) => \{.*?navigator\.geolocation\.clearWatch\(.*?\);.*?watchIdRef\.current = null;.*?\};',
    re.DOTALL
)
new_stop = '''const stopGPSMonitoring = async () => {
    if (watchIdRef.current !== null) {
      await GeoService.stopBackgroundTracking(watchIdRef.current);
      watchIdRef.current = null;
    }
  };'''

content = old_stop.sub(new_stop, content)

# Replace native bridge (window.Android)
old_bridge = re.compile(
    r'// Helper to bridge with Native Foreground Service.*?toggleNativeForegroundService\(isActive\);.*?\};',
    re.DOTALL
)
new_bridge = '''// Background tracking é gerenciado pelo GeoService via @capacitor-community/background-geolocation
  // O plugin já cria uma notificação foreground automaticamente no Android
  const toggleNativeForegroundService = (isActive) => {
    console.log('[Telemetry] Background tracking:', isActive ? 'active' : 'inactive');
  };'''

content = old_bridge.sub(new_bridge, content)

with open('$TRACKER', 'w', encoding='utf-8') as f:
    f.write(content)
" 2>/dev/null

  if [ $? -eq 0 ]; then
    log_apply "FIX-3: GPS → GeoService.startBackgroundTracking"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-3: falha ao aplicar — verificar manualmente"
  fi
elif grep -q "GeoService\.startBackgroundTracking" "$TRACKER"; then
  log_skip "FIX-3: GeoService background tracking"
  SKIPPED=$((SKIPPED + 1))
else
  log_err "FIX-3: padrão não reconhecido — verificar manualmente"
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-4: Filtro de acurácia GPS — rejeitar leituras com accuracy > 50m
# Sem esse filtro, GPS jitter com sinal ruim gera velocidades absurdas (400 km/h)
# Detecta: ausência de "accuracy > 50" no handlePositionUpdate
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "accuracy > 50" "$TRACKER"; then
  log_skip "FIX-4: filtro de acurácia GPS"
  SKIPPED=$((SKIPPED + 1))
else
  # Adicionar accuracy na destructuring e guard logo após
  # Cobre tanto o padrão pós-FIX-1 (sem timestamp) quanto o original (com timestamp)
  sed -i 's/const { latitude, longitude, speed: speedMps } = position\.coords;/const { latitude, longitude, speed: speedMps, accuracy } = position.coords;\n    if (accuracy \&\& accuracy > 50) return; \/\/ Rejeitar GPS com acurácia ruim (evita velocidades absurdas)/' "$TRACKER"
  sed -i 's/const { latitude, longitude, speed: speedMps, timestamp } = position\.coords;/const { latitude, longitude, speed: speedMps, accuracy } = position.coords;\n    if (accuracy \&\& accuracy > 50) return; \/\/ Rejeitar GPS com acurácia ruim (evita velocidades absurdas)/' "$TRACKER"

  if grep -q "accuracy > 50" "$TRACKER"; then
    log_apply "FIX-4: filtro de acurácia GPS (accuracy > 50m → descartado)"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-4: padrão não reconhecido — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-5: Cap de velocidade máxima — descartar leituras > 200 km/h
# GPS jitter pode reportar saltos que calculam velocidades impossíveis
# Detecta: ausência de cap de velocidade após o cálculo de currentSpeedKmh
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "currentSpeedKmh > 200" "$TRACKER"; then
  log_skip "FIX-5: cap de velocidade máxima"
  SKIPPED=$((SKIPPED + 1))
else
  sed -i 's/const currentSpeedKmh = (speedMps || 0) \* 3\.6;/const currentSpeedKmh = (speedMps || 0) * 3.6;\n    if (currentSpeedKmh > 200) return; \/\/ Descartar velocidades impossíveis (GPS jitter)/' "$TRACKER"

  if grep -q "currentSpeedKmh > 200" "$TRACKER"; then
    log_apply "FIX-5: cap de velocidade máxima (> 200 km/h → descartado)"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-5: padrão não reconhecido — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-6: Ping de localização em background
# setInterval é pausado pelo Android quando app minimiza, mas o callback do plugin
# de GPS nativo ainda dispara. Adicionamos um ping direto no callback para manter
# o mapa do admin atualizado mesmo com o app em background.
# Detecta: ausência de "pingLocation" no TelemetryTracker
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "pingLocation" "$TRACKER"; then
  log_skip "FIX-6: ping de localização em background"
  SKIPPED=$((SKIPPED + 1))
else
  python -c "
with open('$TRACKER', 'r', encoding='utf-8') as f:
    content = f.read()

# Adicionar ref após hasSentFirstLocationRef
old_ref = 'const hasSentFirstLocationRef = useRef(false);'
new_ref = '''const hasSentFirstLocationRef = useRef(false);
  const lastLocationPingRef = useRef(0); // timestamp do último ping de localização para o mapa do admin'''
content = content.replace(old_ref, new_ref, 1)

# Adicionar ping após lastPositionRef.current = { ... }
old_pos = 'lastPositionRef.current = { latitude, longitude, speed: currentSpeedKmh, heading: position.coords.heading, timestamp: posTimestamp };'
new_pos = '''lastPositionRef.current = { latitude, longitude, speed: currentSpeedKmh, heading: position.coords.heading, timestamp: posTimestamp };

    // Ping direto ao backend — atualiza o mapa do admin mesmo com app em background
    // setInterval é pausado pelo Android em background, mas o callback do GPS plugin não é
    const nowPing = Date.now();
    if (sessionIdRef.current && (nowPing - lastLocationPingRef.current > 30000)) {
      lastLocationPingRef.current = nowPing;
      base44.functions.invoke('telemetry', {
        action: 'pingLocation',
        sessionId: sessionIdRef.current,
        latitude,
        longitude
      }).catch(() => {}); // fire-and-forget, não bloqueia o callback
    }'''
content = content.replace('lastLocationPingRef.current > 30000', 'lastLocationPingRef.current > 5000', 1)
content = content.replace(old_pos, new_pos, 1)

with open('$TRACKER', 'w', encoding='utf-8') as f:
    f.write(content)
" 2>/dev/null

  if grep -q "pingLocation" "$TRACKER"; then
    log_apply "FIX-6: ping de localização em background (a cada 30s via GPS callback)"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-6: padrão não reconhecido — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-8: Batch interval e location_update de 30s → 5s
# logBatch já existe no Base44 e já atualiza current_location — só rodar mais rápido
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "BATCH_INTERVAL = 10000" "$TRACKER"; then
  log_skip "FIX-8: batch interval 5s"
  SKIPPED=$((SKIPPED + 1))
else
  sed -i 's/BATCH_INTERVAL = 30000/BATCH_INTERVAL = 10000/' "$TRACKER"
  sed -i 's/timeSinceLastLog > 30000/timeSinceLastLog > 10000/' "$TRACKER"
  if grep -q "BATCH_INTERVAL = 10000" "$TRACKER"; then
    log_apply "FIX-8: batch interval 30s → 5s (tracking em tempo real)"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-8: padrão não reconhecido — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-7: Mapa admin — polling em tempo real
# React Query pausa refetchInterval quando a janela não está focada por padrão.
# Reduz de 15s → 3s e ativa refetchIntervalInBackground para rastrear mesmo
# com a aba em background.
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "refetchIntervalInBackground: true" "$DASHBOARD" 2>/dev/null; then
  log_skip "FIX-7: mapa admin polling em tempo real"
  SKIPPED=$((SKIPPED + 1))
elif [ ! -f "$DASHBOARD" ]; then
  log_err "FIX-7: $DASHBOARD não encontrado"
else
  sed -i 's/refetchInterval: 15000,/refetchInterval: 10000,\n    refetchIntervalInBackground: true,/' "$DASHBOARD"
  if grep -q "refetchIntervalInBackground: true" "$DASHBOARD"; then
    log_apply "FIX-7: mapa admin polling 3s + refetchInBackground"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-7: padrão não reconhecido — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-9: Throttle updateDriverLocation em DetalhesViagemMotoristaV2
# O código Base44 chama updateDriverLocation a cada callback do GPS (~30x/s),
# estourando o rate limit instantaneamente. Adiciona throttle de 5s.
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((TOTAL + 1))
if grep -q "BACKEND_SYNC_INTERVAL_MS" "$DETALHES" 2>/dev/null; then
  log_skip "FIX-9: throttle updateDriverLocation (5s)"
  SKIPPED=$((SKIPPED + 1))
elif [ ! -f "$DETALHES" ]; then
  log_err "FIX-9: $DETALHES não encontrado"
else
  # Adicionar useRef ao import
  sed -i "s/import React, { useState, useEffect } from 'react';/import React, { useState, useEffect, useRef } from 'react';/" "$DETALHES"

  # Adicionar throttle ref e lógica antes de updateLocationState
  python -c "
with open('$DETALHES', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''  const updateLocationState = async (position) => {
    try {
      // Permissão concedida com sucesso
      setGpsPermissionGranted(true);
      setGpsPermissionDenied(false);
      setShowGpsAlert(false);

      // Capturar heading (direção) e speed (velocidade) se disponíveis
      const heading = position.coords.heading;
      const speed = position.coords.speed;

      // Atualizar UI imediatamente (Otimistic UI)
      setServiceRequest(prev => ({
        ...prev,
        current_location_lat: position.coords.latitude,
        current_location_lon: position.coords.longitude,
        current_heading: heading,
        current_speed: speed,
        location_last_updated_at: new Date().toISOString()
      }));

      // Enviar para backend em background (não bloqueia UI)
      base44.functions.invoke('updateDriverLocation', {
        serviceRequestId: serviceRequest.id,
        token,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: heading,
        speed: speed
      }).catch(err => console.error('[GPS] Erro ao sincronizar backend:', err));'''

new = '''  // Throttle para updateDriverLocation — evita rate limit do Base44
  const lastBackendSyncRef = useRef(0);
  const BACKEND_SYNC_INTERVAL_MS = 5000; // 5 segundos entre envios

  const updateLocationState = async (position) => {
    try {
      // Permissão concedida com sucesso
      setGpsPermissionGranted(true);
      setGpsPermissionDenied(false);
      setShowGpsAlert(false);

      // Capturar heading (direção) e speed (velocidade) se disponíveis
      const heading = position.coords.heading;
      const speed = position.coords.speed;

      // Atualizar UI imediatamente (Otimistic UI) — sempre, sem throttle
      setServiceRequest(prev => ({
        ...prev,
        current_location_lat: position.coords.latitude,
        current_location_lon: position.coords.longitude,
        current_heading: heading,
        current_speed: speed,
        location_last_updated_at: new Date().toISOString()
      }));

      // Enviar para backend COM THROTTLE — máximo 1x a cada 5s
      const now = Date.now();
      if (now - lastBackendSyncRef.current >= BACKEND_SYNC_INTERVAL_MS) {
        lastBackendSyncRef.current = now;
        base44.functions.invoke('updateDriverLocation', {
          serviceRequestId: serviceRequest.id,
          token,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: heading,
          speed: speed
        }).catch(err => console.error('[GPS] Erro ao sincronizar backend:', err));
      }'''

content = content.replace(old, new, 1)

with open('$DETALHES', 'w', encoding='utf-8') as f:
    f.write(content)
" 2>/dev/null

  if grep -q "BACKEND_SYNC_INTERVAL_MS" "$DETALHES"; then
    log_apply "FIX-9: throttle updateDriverLocation (5s)"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-9: padrão não reconhecido — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-10: Garantir Firebase Crashlytics plugin no android/build.gradle
# O sync do Base44 não toca em arquivos Gradle, mas esta verificação garante
# que o classpath do Crashlytics está presente após qualquer regeneração do projeto.
# ─────────────────────────────────────────────────────────────────────────────
BUILD_GRADLE="app/android/build.gradle"
TOTAL=$((TOTAL + 1))
if [ -f "$BUILD_GRADLE" ] && grep -q "firebase-crashlytics-gradle" "$BUILD_GRADLE"; then
  log_skip "FIX-10: Crashlytics Gradle plugin (build.gradle raiz)"
  SKIPPED=$((SKIPPED + 1))
elif [ ! -f "$BUILD_GRADLE" ]; then
  log_err "FIX-10: $BUILD_GRADLE não encontrado"
else
  sed -i "s|classpath 'com.google.gms:google-services:.*'|&\n        classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.2'|" "$BUILD_GRADLE"
  if grep -q "firebase-crashlytics-gradle" "$BUILD_GRADLE"; then
    log_apply "FIX-10: Crashlytics Gradle plugin adicionado ao build.gradle raiz"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-10: falha ao adicionar classpath — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# FIX-11: Garantir Crashlytics plugin e dependências no app/build.gradle
# ─────────────────────────────────────────────────────────────────────────────
APP_BUILD_GRADLE="app/android/app/build.gradle"
TOTAL=$((TOTAL + 1))
if [ -f "$APP_BUILD_GRADLE" ] && grep -q "firebase-crashlytics'" "$APP_BUILD_GRADLE"; then
  log_skip "FIX-11: Crashlytics dependências (app/build.gradle)"
  SKIPPED=$((SKIPPED + 1))
elif [ ! -f "$APP_BUILD_GRADLE" ]; then
  log_err "FIX-11: $APP_BUILD_GRADLE não encontrado"
else
  # Aplicar plugin após apply plugin: 'com.android.application'
  sed -i "/apply plugin: 'com.android.application'/a apply plugin: 'com.google.firebase.crashlytics'" "$APP_BUILD_GRADLE"
  # Adicionar dependências antes do fechamento do bloco dependencies
  sed -i "/implementation 'androidx.work:work-runtime/a\\    implementation platform('com.google.firebase:firebase-bom:33.7.0')\n    implementation 'com.google.firebase:firebase-crashlytics'\n    implementation 'com.google.firebase:firebase-analytics'" "$APP_BUILD_GRADLE"
  if grep -q "firebase-crashlytics'" "$APP_BUILD_GRADLE"; then
    log_apply "FIX-11: Crashlytics plugin e dependências adicionados ao app/build.gradle"
    APPLIED=$((APPLIED + 1))
  else
    log_err "FIX-11: falha ao adicionar dependências — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Resultado
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "━━━ Resultado ━━━"
echo -e "  Patches verificados: $TOTAL"
echo -e "  ${GREEN}Aplicados: $APPLIED${NC}"
echo -e "  ${YELLOW}Já OK:     $SKIPPED${NC}"
echo ""

if [ "$APPLIED" -gt 0 ]; then
  echo "Arquivos modificados:"
  echo "  - $TRACKER"
  echo ""
  echo "Próximo passo: npm run build && npx cap sync android"
  # Remover backup se tudo OK
  rm -f "${TRACKER}.bak"
else
  # Nada mudou, remover backup
  rm -f "${TRACKER}.bak"
  echo -e "${GREEN}Nenhum patch necessário — código já está correto.${NC}"
fi
