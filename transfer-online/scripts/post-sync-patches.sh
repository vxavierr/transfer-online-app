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
# =============================================================================

set -euo pipefail

TRACKER="app/src/components/telemetry/TelemetryTracker.jsx"
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
if grep -q "import GeoService from" "$TRACKER"; then
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
