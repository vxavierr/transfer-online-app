# Fase 7 — window.open → BrowserService
Data: 2026-03-13
Agente: @dev (Dex)
Branch: feat/mobile-capacitor

## Status: CONCLUÍDA (com call sites pendentes documentados)

## O que foi feito

### Serviço criado
- `app/src/native/services/BrowserService.js` — abstração window.open / @capacitor/browser / App.openUrl

### Total de call sites encontrados
38 ocorrências em 17 arquivos

## Call sites migrados (29 total)

| Arquivo | Calls migrados | Tipo |
|---------|---------------|------|
| `DetalhesViagemMotorista.jsx` | 6 | WhatsApp, Calendar, Maps (Waze/Google), receptive_sign_url |
| `DetalhesViagemMotoristaV2.jsx` | 6 | WhatsApp, Calendar, Maps (Waze/Google), receptive_sign_url |
| `DashboardMotorista.jsx` | 2 | Calendar, Google Maps |
| `DashboardMotoristaV2.jsx` | 2 | Calendar, Google Maps |
| `GerenciarReceptivos.jsx` | 2 | WhatsApp |
| `ReceptiveListStatus.jsx` | 3 | tel:, WhatsApp, receptive_sign_url |
| `ReceptiveListEventView.jsx` | 4 | tel:, WhatsApp, Uber web fallback |
| `PassengerActionsMenu.jsx` | 3 | tel:, WhatsApp, Uber |
| `WhatsAppShareButton.jsx` | 1 | WhatsApp |

## Call sites NÃO migrados (pendentes) — documentados

| Arquivo | Linha | Motivo de não migrar |
|---------|-------|---------------------|
| `BoardingPassModal.jsx` | 85 | `window.open('', '_blank')` com conteúdo inline para impressão. Fluxo de print window — não é URL. NÃO migrar. |
| `TermosAceiteMotoristas.jsx` | 194 | `window.open('', '_blank')` para gerar HTML de impressão inline. Mesmo padrão. NÃO migrar. |
| `NovaReserva.jsx` | 840 | `window.open(standaloneUrl, '_top')` abre na mesma aba. NÃO é deep link. Não migrar. |
| `AprovacaoMotorista.jsx` | 198, 210, 224 | URLs de documentos (CNH, ASO, PGR). Admin-facing. Baixa prioridade mobile. Pendente Wave 3c. |
| `GerenciarFaturamento.jsx` | 837, 864 | URLs de faturas/documentos. Admin-facing. Pendente Wave 3c. |
| `GerenciarLinksCompartilhados.jsx` | 224, 236 | Admin-facing. Pendente Wave 3c. |
| `ShareEventLinkDialog.jsx` | 87 | Admin-facing. Pendente Wave 3c. |
| `MeusMotoristas.jsx` | 548 | Admin-facing. Pendente Wave 3c. |
| `supplier/VehicleManager.jsx` | 296 | Admin-facing. Pendente Wave 3c. |
| `supplier/DriverFormDialog.jsx` | 333 | Admin-facing. Pendente Wave 3c. |
| `EventDetails.jsx` | 4823 | Comentado (`// window.open(url, '_blank')`). Ignorado. |

## Plugins instalados necessários
```bash
cd app && npm install @capacitor/browser && npx cap sync
```
(a ser executado pelo dev/CI)

## Lógica do BrowserService

- `tel:`, `mailto:`, `whatsapp:`, `wa.me`, `api.whatsapp.com`, `maps.google.com`, `m.uber.com`, `calendar.google.com` → `App.openUrl` (app nativo do sistema)
- Outras URLs `https://` → `Browser.open` (in-app browser Capacitor)
- Web: `window.open` original
- Fallback gracioso: se qualquer plugin falhar, cai em `window.open`
