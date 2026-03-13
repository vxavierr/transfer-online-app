# Fase 4 — GPS Nativo e Background Geolocation

**Data:** 2026-03-13
**Agente:** @dev (Dex)
**Branch:** feat/mobile-capacitor
**Status:** CONCLUÍDO — build EXIT 0, cap sync EXIT 0

---

## Resumo

Implementação da abstração de geolocalização nativa para o app TransferOnline.
Criação do `GeoService` como camada única de GPS e migração de todos os 5 arquivos
que usavam `navigator.geolocation` diretamente.

---

## Plugins Instalados

| Pacote | Versão | Função |
|--------|--------|--------|
| `@capacitor/geolocation` | ^8.1.0 | GPS em foreground — getCurrentPosition, watchPosition |
| `@capacitor-community/background-geolocation` | ^1.2.26 | GPS em background — tracking contínuo com app minimizado |

---

## Arquivo Criado

### `app/src/native/services/GeoService.js`

Serviço de abstração completo com os seguintes métodos:

| Método | Substitui | Notas |
|--------|-----------|-------|
| `requestPermission()` | N/A | Solicita permissão explícita no nativo |
| `getCurrentPosition(options)` | `navigator.geolocation.getCurrentPosition` | async, compatível com Web e Nativo |
| `watchPosition(callback, error, options)` | `navigator.geolocation.watchPosition` | async — retorna watchId |
| `clearWatch(watchId)` | `navigator.geolocation.clearWatch` | async — aceita string (nativo) ou number (web) |
| `startBackgroundTracking(callback, options)` | N/A | Background GPS via registerPlugin — distanceFilter: 10m |
| `stopBackgroundTracking(watcherId)` | N/A | Para watcher de background |
| `isAvailable()` | `'geolocation' in navigator` | síncrono, compatível Web e Nativo |

**Decisão técnica:** `@capacitor-community/background-geolocation` não possui bundle JS
para importação via bundler (sem campo `main`/`module`/`exports` no package.json).
A solução foi usar `Capacitor.registerPlugin('BackgroundGeolocation')` em runtime,
que é a abordagem correta para plugins Capacitor sem wrapper JS.
Isso evita o erro do Vite: `Failed to resolve entry for package`.

O barrel export `src/native/index.js` foi atualizado para re-exportar `GeoService`.

---

## Arquivos Migrados

### 1. `app/src/pages/DashboardMotorista.jsx`

**O que mudou:** Função `askForGPS()` convertida de síncrona para async.
`navigator.geolocation.getCurrentPosition` substituído por `GeoService.getCurrentPosition`.
Verificação `'geolocation' in navigator` substituída por `GeoService.isAvailable()`.

### 2. `app/src/pages/DashboardMotoristaV2.jsx`

**O que mudou:** Idêntico ao DashboardMotorista.jsx — mesma migração da função `askForGPS`.

### 3. `app/src/pages/DetalhesViagemMotorista.jsx`

**O que mudou:**
- `requestGPSPermission()` — migrado de callback-based para async/await com GeoService
- `handleStatusUpdate()` — `getCurrentPosition` para obter localização antes de enviar status
- `handleSaveAdditionalStop()` — idem
- `handleConfirmFinalization()` — `clearWatch` substituído por `stopBackgroundTracking`
- `startContinuousTracking()` — **PRINCIPAL MUDANÇA**: convertido para async, usa `startBackgroundTracking` em vez de `watchPosition`. Mantém GPS com app minimizado. É o componente responsável pelo tracking durante a viagem.
- `stopContinuousTracking()` — usa `stopBackgroundTracking`
- `useEffect` cleanup — usa `stopBackgroundTracking`

### 4. `app/src/pages/DetalhesViagemMotoristaV2.jsx`

**O que mudou:** Migração idêntica ao `DetalhesViagemMotorista.jsx` (V2 é a versão mais recente com suporte a paradas planejadas). Inclui migração adicional de `getCurrentPosition` na função de parada planejada.

### 5. `app/src/components/telemetry/TelemetryTracker.jsx`

**O que mudou:**
- `startGPSMonitoring()` — convertido para async, usa `startBackgroundTracking`
- `stopGPSMonitoring()` — usa `stopBackgroundTracking`

**Componente identificado como responsável pelo background tracking principal:**
`TelemetryTracker.jsx` é o componente com tracking de mais alta frequência
(distanceFilter: 5m para telemetria vs 10m para tracking de localização).
Rastreia velocidade, frenagem, curvas e km percorrido.
Os `DetalhesViagemMotorista` fazem o tracking de posição para atualização do backend.

---

## Permissões Android Adicionadas

Arquivo: `app/android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

`FOREGROUND_SERVICE_LOCATION` é obrigatória no Android 14+ para serviços de localização em foreground.

---

## Resultado do Build

```
npm run build  → EXIT 0
npx cap sync   → EXIT 0

Plugins detectados pelo cap sync:
  @capacitor-community/background-geolocation@1.2.26
  @capacitor/app@8.0.1
  @capacitor/geolocation@8.1.0
  @capacitor/preferences@8.0.1
  @capacitor/splash-screen@8.0.1
  @capacitor/status-bar@8.0.1
```

---

## Limitações e Pendências

### Background tracking só testável em dispositivo físico

O `@capacitor-community/background-geolocation` não funciona em emulador Android
(sem GPS real) nem no browser. O fallback para `watchPosition` é ativado
automaticamente quando `Capacitor.isNativePlatform()` retorna false.

**Para testar o background tracking real:**
1. Build Android: `npx cap build android`
2. Instalar APK no dispositivo físico
3. Iniciar uma viagem no `DetalhesViagemMotorista`
4. Minimizar o app
5. Confirmar que as posições continuam chegando no painel admin

### Permissões iOS

Não foram adicionadas permissões iOS (Info.plist) nesta fase porque:
- Não há projeto iOS configurado (sem `app/ios/`)
- As chaves necessárias serão: `NSLocationWhenInUseUsageDescription` e `NSLocationAlwaysAndWhenInUseUsageDescription`

### Background mode iOS

No iOS, o background tracking requer `UIBackgroundModes: location` no Info.plist.
Isso precisa ser adicionado quando o projeto iOS for criado.

---

## Desvios da Arquitetura com Justificativa

### Uso de `registerPlugin` em vez de import

**ADR-03 esperava:** `import BackgroundGeolocation from '@capacitor-community/background-geolocation'`

**O que foi feito:** `Capacitor.registerPlugin('BackgroundGeolocation')`

**Justificativa:** O pacote não possui bundle JavaScript (nenhum campo `main`/`module`/`exports`
no package.json) — é um plugin Capacitor puro que só existe como código nativo (Java/Swift).
O `registerPlugin` é a API oficial do Capacitor para exatamente este caso. O comportamento
em runtime é idêntico ao import.

### `startContinuousTracking` se tornou async

**Impacto:** As funções que chamam `startContinuousTracking` continuam funcionando — a função
é chamada via `.then()` (no useEffect que chama `requestGPSPermission().then(...)`) ou
diretamente sem await (o caller não precisava do retorno). React não bloqueia em funções async
chamadas em event handlers.
