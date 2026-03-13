# Storage Migration — localStorage → StorageService
Data: 2026-03-13
Agente: @dev (Dex)
Branch: feat/mobile-capacitor

## Status: PARCIALMENTE CONCLUÍDA (call sites seguros migrados; blocos críticos documentados)

## Total de call sites encontrados
~50 calls em 8 arquivos (excluindo node_modules, api/, e StorageService.js em si)

## Migrados nesta wave

| Arquivo | Key migrada | Calls | Estratégia |
|---------|-------------|-------|-----------|
| `LanguageContext.jsx` | `app_language` | 2 | async useEffect para sync + localStorage síncrono para init state |
| `DashboardMotorista.jsx` | `gps_permission_granted` | 3 | já estava em função async |
| `DashboardMotoristaV2.jsx` | `gps_permission_granted` | 3 | já estava em função async |
| `DashboardMotoristaV2.jsx` | `dismissedDriverAlerts` | 2 | useEffect async wrapper + handler .catch() |

**Total migrado: 10 call sites em 4 arquivos**

## NÃO migrados — pendências documentadas

### DetalhesViagemMotorista.jsx (13 calls — linhas 210, 221, 234, 238, 247, 252, 258, 413, 422, 477, 529, 830, 1069)
**Motivo:** `gps_permission_granted` e `driver_safety_alert_{tripId}` são lidos em múltiplos pontos
de fluxo crítico de GPS (watchPosition callbacks, `gps_permission_granted` como condição de inicialização
do rastreamento). Conversão async exigiria refatoração do `useEffect` principal de GPS (300+ linhas).
**Risco:** Alto. Deixar para Wave 3c com refatoração focada.

### DetalhesViagemMotoristaV2.jsx (13 calls — linhas 213, 224, 237, 241, 250, 255, 261, 416, 425, 482, 562, 880, 1123)
**Motivo:** Idem. Versão V2 tem mesmo padrão crítico.
**Risco:** Alto.

### ReceptiveListEventView.jsx (3 calls — linhas 117, 145, 156)
**Motivo:** Cache de receptivo com timestamp (`receptive_cache_{eventId}`). Padrão de cache
com invalidação por tempo — funcional como está. Em nativo, o cache também funcionará via localStorage
(não há risco de perda em iOS porque não é dado crítico de auth). Baixa prioridade.

### NovaReserva.jsx (7 calls — linhas 199, 215, 398, 416, 614, 935, 1002)
**Motivo:** `nova_reserva_booking_state` é o carrinho de reserva — estado crítico de multi-step form.
Conversão async afeta 5 pontos de save/restore do estado do formulário. Exige testes cuidadosos
para não perder dados do carrinho. Deixar para Wave 3c.

## Nota sobre chaves Base44 (NÃO migrar)
As chaves `base44_access_token`, `base44_app_id`, `base44_server_url`, `base44_functions_version`,
`base44_from_url` são gerenciadas pelo `@base44/sdk` via `app-params.js` diretamente em localStorage.
O SDK não passa por StorageService. Nunca migrar essas chaves.

## Resultado para iOS
Com as 10 calls migradas, as preferências de idioma e alertas dispensados
já usam Capacitor Preferences — mais confiável que localStorage em iOS Safari WebView.
Os dados críticos de GPS (gps_permission_granted) ainda usam localStorage em DetalhesViagem*
mas são reescalvágicos ao ser alterados (sem perda de dados).
