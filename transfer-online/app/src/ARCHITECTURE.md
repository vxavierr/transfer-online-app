# Arquitetura — Transfer Online

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite |
| UI | shadcn/ui (New York) + Radix UI + Tailwind CSS 3.4 |
| Data | TanStack React Query v5 + Base44 SDK |
| Routing | React Router v6 (BrowserRouter web / MemoryRouter nativo) |
| i18n | LanguageContext custom (pt-BR, en, es) |
| Backend | Base44 SDK + 180+ cloud functions (TypeScript) |
| Nativo | Capacitor 8 (Android/iOS) |
| Pagamentos | Stripe |
| Mapas | Google Maps JavaScript API |

## Estrutura

src/
  api/              Base44 client, entities, integrations
  components/       225+ componentes (ui, admin, booking, event, driver, supplier, telemetry)
  lib/              AuthContext, app-params, query-client
  native/           CAMADA NATIVA (StorageService, GeoService, CameraService, BrowserService)
  pages/            83 páginas
  hooks/            Hooks customizados
  utils/            Utilitários

## Roles

| Role | Dashboard |
|------|-----------|
| Admin | AdminDashboard |
| Motorista | DashboardMotoristaV2 |
| Fornecedor | MinhasSolicitacoesFornecedor |
| Corporativo | SolicitarViagemCorporativa |
| Gestor Evento | GerenciarEventos |
| Público | NovaReserva |

## Arquivos Críticos (impactam nativo)

- App.jsx — Dual-router (MemoryRouter nativo / BrowserRouter web)
- Layout.jsx — Navegação, roles, PWA, analytics (1535 linhas)
- app-params.js — Token, appId, serverUrl
- pages.config.js — Registro automático de páginas
- src/native/ — Camada de abstração Capacitor (NÃO TOCAR)