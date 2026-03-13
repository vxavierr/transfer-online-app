# Fase 8 — App Lifecycle
Data: 2026-03-13
Agente: @dev (Dex)
Branch: feat/mobile-capacitor

## Status: CONCLUÍDA

## O que foi feito

### Hooks criados
- `app/src/native/hooks/useAppLifecycle.js` — foreground/background via @capacitor/app
- `app/src/native/hooks/useNetworkStatus.js` — conectividade via @capacitor/network + navigator.onLine

### index.js atualizado
- `app/src/native/index.js` — exports de CameraService, BrowserService, useAppLifecycle, useNetworkStatus

## Detalhes dos hooks

### useAppLifecycle
- Em nativo: `App.addListener('appStateChange')` → onForeground/onBackground
- Em web: no-op silencioso (compatibilidade mantida)
- Import dinâmico de @capacitor/app para graceful degradation
- Cleanup automático via `listenerHandle.remove()`

### useNetworkStatus
- Em nativo: `@capacitor/network` → `getStatus()` inicial + `addListener('networkStatusChange')`
- Em web: `navigator.onLine` + eventos `online`/`offline` da window
- Retorna `{ connected: boolean, connectionType: string }`

## Candidatos para usar useAppLifecycle identificados

| Arquivo | Padrão atual | Ação recomendada |
|---------|-------------|-----------------|
| `TelemetryTracker.jsx` | Nenhum lifecycle explícito encontrado | Pode usar `onBackground` para pausar watchPosition |
| `DashboardMotorista.jsx` | Polling via TanStack Query | Usar `onForeground` para `queryClient.invalidateQueries()` ao voltar |
| `DashboardMotoristaV2.jsx` | Idem | Idem |

Nenhum `document.addEventListener('visibilitychange')` foi encontrado no codebase —
não há migração de listeners existentes necessária.

## Plugin instalado necessário
```bash
cd app && npm install @capacitor/network && npx cap sync
```
(a ser executado pelo dev/CI — @capacitor/app já estava instalado da Fase 1)
