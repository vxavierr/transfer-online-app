# Wave 3b — Summary
Data: 2026-03-13
Agente: @dev (Dex)
Branch: feat/mobile-capacitor

---

## Status por Fase

| Fase | Status | Detalhes |
|------|--------|----------|
| Fase 6 (QR Scanner) | CONCLUÍDA com pendência | CameraService criado, QRCodeScanner atualizado. jsQR decode pendente Wave 3c. |
| Fase 7 (window.open) | CONCLUÍDA com pendências | 29/38 calls migrados. 9 restantes são admin-facing ou casos especiais (impressão inline). |
| Fase 8 (Lifecycle) | CONCLUÍDA | useAppLifecycle + useNetworkStatus criados e exportados. |
| Storage Migration | PARCIALMENTE CONCLUÍDA | 10 calls migrados (LanguageContext, Dashboard GPS, dismissedAlerts). 28 pendentes (DetalhesViagem + NovaReserva = alta complexidade). |

---

## Camada nativa src/native/ — estado atual

```
app/src/native/
├── index.js                              # Barrel export (atualizado Wave 3b)
├── services/
│   ├── StorageService.js                 # Wave 3a — localStorage/Preferences
│   ├── GeoService.js                     # Wave 3a — navigator.geolocation/@capacitor/geolocation
│   ├── CameraService.js                  # Wave 3b Fase 6 — @capacitor/camera/html5-qrcode
│   └── BrowserService.js                 # Wave 3b Fase 7 — @capacitor/browser/App.openUrl
└── hooks/
    ├── useAppLifecycle.js                # Wave 3b Fase 8 — @capacitor/app lifecycle
    └── useNetworkStatus.js              # Wave 3b Fase 8 — @capacitor/network + navigator.onLine
```

---

## Plugins Capacitor necessários (instalar antes do build)

```bash
cd app
npm install @capacitor/camera @capacitor/browser @capacitor/network
npx cap sync
```

**Já instalados (Wave 3a):** @capacitor/core, @capacitor/cli, @capacitor/app,
@capacitor/status-bar, @capacitor/splash-screen, @capacitor/android, @capacitor/preferences

---

## Arquivos modificados nesta wave

| Arquivo | Tipo de mudança |
|---------|----------------|
| `app/src/native/index.js` | +CameraService, +BrowserService, +useAppLifecycle, +useNetworkStatus |
| `app/src/native/services/CameraService.js` | CRIADO |
| `app/src/native/services/BrowserService.js` | CRIADO |
| `app/src/native/hooks/useAppLifecycle.js` | CRIADO |
| `app/src/native/hooks/useNetworkStatus.js` | CRIADO |
| `app/src/components/QRCodeScanner.jsx` | +branching nativo/web via CameraService |
| `app/src/components/LanguageContext.jsx` | +StorageService para app_language |
| `app/src/components/billing/WhatsAppShareButton.jsx` | window.open → BrowserService |
| `app/src/components/receptive/PassengerActionsMenu.jsx` | window.open → BrowserService |
| `app/src/pages/DashboardMotorista.jsx` | +BrowserService, +StorageService (gps_permission_granted) |
| `app/src/pages/DashboardMotoristaV2.jsx` | +BrowserService, +StorageService (gps + dismissedAlerts) |
| `app/src/pages/DetalhesViagemMotorista.jsx` | +BrowserService (WhatsApp, Calendar, Maps, sign_url) |
| `app/src/pages/DetalhesViagemMotoristaV2.jsx` | +BrowserService (WhatsApp, Calendar, Maps, sign_url) |
| `app/src/pages/GerenciarReceptivos.jsx` | +BrowserService (WhatsApp) |
| `app/src/pages/ReceptiveListStatus.jsx` | +BrowserService (tel:, WhatsApp, sign_url) |
| `app/src/pages/ReceptiveListEventView.jsx` | +BrowserService (tel:, WhatsApp, Uber) |
| `app/android/app/src/main/AndroidManifest.xml` | +CAMERA permission + hardware feature |

---

## Call sites pendentes

### localStorage não migrado
- `DetalhesViagemMotorista.jsx` — 13 calls (`gps_permission_granted`, `driver_safety_alert_*`, `driver_preferred_map_app`)
- `DetalhesViagemMotoristaV2.jsx` — 13 calls (idem)
- `NovaReserva.jsx` — 7 calls (`nova_reserva_booking_state` carrinho)
- `ReceptiveListEventView.jsx` — 3 calls (cache de receptivo)

### window.open não migrado
- `BoardingPassModal.jsx`, `TermosAceiteMotoristas.jsx` — print inline (NÃO migrar)
- `NovaReserva.jsx` — `window.open(..., '_top')` (NÃO migrar)
- Admin-facing: `AprovacaoMotorista.jsx`, `GerenciarFaturamento.jsx`, `GerenciarLinksCompartilhados.jsx`, `ShareEventLinkDialog.jsx`, `MeusMotoristas.jsx`, `VehicleManager.jsx`, `DriverFormDialog.jsx` (pendente Wave 3c)

---

## Pronto para Wave 3c

Liberado:
- **Instalação dos 3 novos plugins**: `@capacitor/camera @capacitor/browser @capacitor/network`
- **Build + sync**: `npm run build && npx cap sync`
- **Validação no emulador Android**: Chrome DevTools `chrome://inspect`
- **Teste de CORS Base44**: verificar que `https://localhost` origin é aceita
- **Teste de fluxo de login**: `?access_token=` via URL em WebView

Não liberado (bloqueios externos):
- Push Notifications: requer `google-services.json` (Firebase) + APNs (Apple Developer)
- Background GPS: requer decisão sobre licença `@capacitor-community/background-geolocation`
- jsQR decode para QR em nativo (Wave 3c)

---

## Bloqueios encontrados

**BASH bloqueado nesta sessão** — os comandos `npm install` e `npm run build` não foram executados.
Os arquivos de código estão prontos mas os builds devem ser executados manualmente:

```bash
cd D:/workspace/projects/transfer-online/app
npm install @capacitor/camera @capacitor/browser @capacitor/network
npm run build
npx cap sync
```

Todos os arquivos criados/modificados estão presentes e o build deve passar (EXIT 0):
- Imports são via `@capacitor/core` (Capacitor.isNativePlatform) que já está instalado
- Imports de plugins específicos são DINÂMICOS (`await import('@capacitor/camera')`)
  → o build não falha se o pacote não está instalado ainda, só falha em runtime
- Nenhuma alteração de API pública existente — apenas adição de novos arquivos e imports

---

## Commits desta wave

A serem criados após validar o build:
```
feat: add CameraService for native QR scanning [Wave3-Fase6]
feat: add BrowserService to replace window.open for native [Wave3-Fase7]
feat: add lifecycle hooks and network status for native [Wave3-Fase8]
feat: migrate safe localStorage call sites to StorageService [Wave3-Storage]
```
