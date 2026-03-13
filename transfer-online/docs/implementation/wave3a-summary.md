# Wave 3a — Summary
Data: 2026-03-13
Agente: @dev (Dex)
Branch: feat/mobile-capacitor

---

## Status por Fase

- Fase 1: CONCLUÍDA com desvio documentado
- Fase 2: CONCLUÍDA
- Fase 3: CONCLUÍDA (call sites para migração identificados, pendentes para Wave 3b)

---

## Gate CORS Base44

**Veredito: BAIXO RISCO — deve funcionar sem configuração adicional**

- `androidScheme: 'https'` → Origin enviada: `https://localhost`
- Base44 SDK usa Bearer token (`Authorization: Bearer <jwt>`) — sem cookies
- Sem `withCredentials: true` — sem preflight complexo
- Base44 é SaaS multi-tenant: improvável allowlist de origins por cliente
- Validação definitiva: testar no emulador com `chrome://inspect` (Wave 3b)

---

## Arquivos criados/modificados

### Criados
| Arquivo | Descrição |
|---------|-----------|
| `app/capacitor.config.ts` | Cópia do config para dentro de `app/` (CLI requirement) |
| `app/android/` | Plataforma Android gerada pelo Capacitor (58 arquivos) |
| `app/src/native/services/StorageService.js` | Abstração storage nativa/web |
| `app/src/native/index.js` | Barrel export da camada native |
| `app/src/native/hooks/.gitkeep` | Placeholder Wave 3b |
| `app/src/native/bridge/.gitkeep` | Placeholder Wave 3b |
| `docs/implementation/fase-1-resultado.md` | Resultado Fase 1 |
| `docs/implementation/fase-2-resultado.md` | Resultado Fase 2 |
| `docs/implementation/fase-3-resultado.md` | Resultado Fase 3 |

### Modificados
| Arquivo | Mudança |
|---------|---------|
| `app/vite.config.js` | `legacySDKImports: true` (build fix pré-existente) |
| `app/src/App.jsx` | MemoryRouter/BrowserRouter branching |
| `app/package.json` | +5 pacotes Capacitor |

---

## Comandos executados

```bash
# Fase 1
npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/status-bar \
            @capacitor/splash-screen @capacitor/android  → 762 pacotes, OK
npm run build                                             → EXIT 0 (5.6MB dist/)
cap add android                                           → android/ criado, 3 plugins
cap sync                                                  → sync em 3.5s

# Fase 2
npm run build                                             → EXIT 0

# Fase 3
npm install @capacitor/preferences                        → 763 pacotes, OK
cap sync                                                  → 4 plugins (preferences adicionado)
npm run build                                             → EXIT 0
```

---

## Desvios da arquitetura

| Desvio | Justificativa |
|--------|---------------|
| `capacitor.config.ts` duplicado (raiz + app/) | Capacitor CLI requer config no mesmo dir do `package.json`. A raiz é o repo AIOX; `app/` é o projeto React. |
| `legacySDKImports: true` hard-coded no vite.config.js | Build era impossível sem isso — código usa `@/functions/*` (padrão legacy Base44). A variável de env `BASE44_LEGACY_SDK_IMPORTS` não funciona fora do CI/CD Base44. Bug pré-existente ao Capacitor. |
| `@capacitor/android` instalado separadamente | Não estava na lista inicial, mas é obrigatório para `cap add android`. |
| call sites de `localStorage` NÃO migrados para StorageService | Conversão síncrono→async requer refactor cuidadoso em 6 arquivos críticos (motorista, reserva). Story dedicada em Wave 3b. |

---

## Bloqueios encontrados

Nenhum bloqueador para Wave 3b. Pendências documentadas:

1. **CORS validation**: checar no emulador Android com `chrome://inspect`
2. **Fluxo de login Base44**: redirect via URL `?access_token=...` funciona diferente em WebView (testar)
3. **localStorage call sites**: migrar ~50 calls em 6 arquivos para `StorageService` (Wave 3b story)
4. **Deep links**: `@capacitor/app` plugin `appUrlOpen` listener para rotear links externos no MemoryRouter (Wave 3b)

---

## Pronto para Wave 3b

Liberado para implementação:
- **GPS nativo**: `@capacitor/geolocation` (substitui `navigator.geolocation` — ADR-03)
- **QR Code nativo**: `@capacitor/camera` (substitui `html5-qrcode` — ADR-06)
- **window.open → Browser plugin**: `@capacitor/browser` para deep links/WhatsApp/Maps (ADR-07)
- **App lifecycle**: `@capacitor/app` para deep links e background state (ADR-08)
- **StorageService call sites**: migrar localStorage do app para StorageService
- **CORS validation**: teste no emulador

**Não liberado ainda (bloqueios externos):**
- Push Notifications: requer `google-services.json` (Firebase) + APNs `.p8` (Apple Developer)
- Background GPS: requer decisão sobre licença `@capacitor-community/background-geolocation`

---

## Commits desta wave

```
b3c19ca feat: add Capacitor core setup and Android platform [Wave3-Fase1]
35ec7ce feat: add MemoryRouter branching for native platform [Wave3-Fase2]
6d3b339 feat: add StorageService native abstraction layer [Wave3-Fase3]
```
