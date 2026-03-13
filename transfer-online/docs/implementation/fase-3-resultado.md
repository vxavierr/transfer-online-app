# Fase 3 — Storage Seguro: Resultado
Data: 2026-03-13
Agente: @dev (Dex)

## Status: CONCLUÍDA (camada de abstração criada — migração dos call sites é Wave 3b)

---

## O que foi executado

### 1. Plugin instalado

```
npm install @capacitor/preferences@8.0.1
```

Confirmado no sync: 4 plugins no Android (app, preferences, splash-screen, status-bar).

### 2. Estrutura criada em `src/native/`

```
app/src/native/
├── services/
│   └── StorageService.js     ← abstração nativa/web completa
├── hooks/
│   └── .gitkeep              ← preparado para Wave 3b (useGeolocation, useDeepLink)
├── bridge/
│   └── .gitkeep              ← preparado para Wave 3b (BrowserBridge, ShareBridge)
└── index.js                  ← ponto de entrada (export { StorageService })
```

### 3. StorageService implementado

API uniforme para native e web:
- `StorageService.get(key)` → `Promise<string|null>`
- `StorageService.set(key, value)` → `Promise<void>`
- `StorageService.remove(key)` → `Promise<void>`
- `StorageService.clear()` → `Promise<void>`

- **Native:** usa `@capacitor/preferences` (SharedPreferences no Android, UserDefaults no iOS)
- **Web:** delega para `localStorage` (zero regressão)

### 4. Build verificado

```
npm run build → EXIT 0
cap sync → 4 plugins detectados incluindo @capacitor/preferences@8.0.1
```

---

## Análise de localStorage no projeto

### Chaves do Base44 SDK — NÃO migrar

Gerenciadas por `src/lib/app-params.js` internamente. O SDK usa localStorage diretamente e não passará pelo `StorageService`. Migrar quebraria o fluxo de auth.

| Chave | Responsável |
|-------|-------------|
| `base44_access_token` | SDK — `app-params.js` |
| `base44_app_id` | SDK — `app-params.js` |
| `base44_server_url` | SDK — `app-params.js` |
| `base44_functions_version` | SDK — `app-params.js` |
| `base44_from_url` | SDK — `app-params.js` |

**Nota sobre risco A5 (auditoria):** O token `base44_access_token` fica no localStorage, que no iOS pode ser limpo pelo sistema. Porém, o SDK gerencia o refresh internamente — se o token for limpo, o SDK faz redirect para login. O impacto é UX (usuário precisa logar novamente), não perda de dados. Mitigação possível em Wave futura: interceptar a gravação do token e duplicar no `Preferences`, mas isso requer modificar ou wrappear o SDK.

### Chaves do app — DEVEM migrar para StorageService (Wave 3b)

Identificadas por grep em `app/src/` (excluindo `app-params.js` e `StorageService.js`):

| Chave | Arquivos | Prioridade |
|-------|----------|-----------|
| `gps_permission_granted` | DashboardMotorista.jsx, DashboardMotoristaV2.jsx, DetalhesViagemMotorista.jsx, DetalhesViagemMotoristaV2.jsx | ALTA — crítico para GPS |
| `driver_preferred_map_app` | DetalhesViagemMotorista.jsx, DetalhesViagemMotoristaV2.jsx | ALTA — UX motorista |
| `dismissedDriverAlerts` | DashboardMotoristaV2.jsx | MÉDIA |
| `nova_reserva_booking_state` | NovaReserva.jsx | ALTA — carrinho de reserva |
| `app_language` | LanguageContext.jsx | BAIXA — re-selecionável |
| `driver_safety_alert_{tripId}` | DetalhesViagemMotoristaV2.jsx | BAIXA — alert por viagem |
| Cache receptivo | ReceptiveListEventView.jsx | BAIXA — recalculável |

**Total de call sites para migrar: ~50 linhas em 6 arquivos**

### Por que não migrar agora

A migração dos call sites envolve converter código síncrono (`localStorage.getItem()`) para async (`await StorageService.get()`). Isso requer:
1. Adicionar `async` a hooks/funções que leem storage na inicialização
2. Adaptar useEffect e outros calls
3. Testar todos os fluxos de motorista e reserva

Escopo correto: story dedicada em Wave 3b com testes por fluxo.

---

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `app/src/native/services/StorageService.js` | Abstração storage nativo/web |
| `app/src/native/index.js` | Barrel export da camada native |
| `app/src/native/hooks/.gitkeep` | Placeholder para hooks nativos |
| `app/src/native/bridge/.gitkeep` | Placeholder para bridges nativos |
