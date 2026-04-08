# Uhuru OS — Product Requirements Document (PRD)

## Goals

- Centralizar a operacao da agencia Uhuru em uma unica plataforma, eliminando a fragmentacao entre Notion, planilhas, plataformas de ads e n8n
- Fornecer visao consolidada e em tempo real de performance de todos os clientes e campanhas (Meta + Google Ads)
- Integrar um agente AI como cidadao de primeira classe, capaz de executar qualquer operacao que um usuario faria na plataforma
- Reduzir tempo operacional da equipe com automacoes inteligentes e interface unificada
- Criar uma base tecnica reutilizavel (stack identica ao Nexus AI) para futuros produtos internos

## Background Context

A Uhuru e uma agencia brasileira de marketing e trafego pago que opera com ferramentas fragmentadas: Notion para gestao de tarefas, planilhas para planos de midia, plataformas separadas de Meta Ads e Google Ads para campanhas, e n8n para automacoes. Essa fragmentacao gera perda de contexto, retrabalho manual e impossibilidade de visao unificada da operacao.

O Uhuru OS resolve esse problema ao consolidar todas as operacoes em uma plataforma interna AI-native. O diferencial central e que o agente AI nao e um chatbot assistente — ele e um operador completo, com acesso a todos os modulos via tool-calling, capaz de criar tarefas, buscar metricas, gerar relatorios, disparar automacoes e qualquer outra operacao que um usuario humano consegue fazer. Isso permite que a equipe opere com menos fricao e mais velocidade.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-04-08 | 1.0 | PRD inicial — escopo MVP completo | Morgan (@pm) |

---

## Requirements

### Functional

- **FR1:** O sistema deve exibir um Dashboard Geral com visao consolidada de todos os clientes, incluindo metricas agregadas (total spend, ROAS medio, alertas ativos) e cards por cliente com status e KPIs principais.
- **FR2:** O sistema deve fornecer um Dashboard por Cliente com metricas detalhadas (spend, ROAS, CPA, CTR), campanhas ativas (Meta + Google), historico de performance, tarefas relacionadas e plano de midia ativo.
- **FR3:** O sistema deve permitir CRUD completo de clientes com campos: nome, CNPJ, contato, status (ativo/pausado/encerrado), contas de ads vinculadas (Meta account ID, Google account ID), documentos/contratos (via Supabase Storage) e historico de acoes do agente por cliente.
- **FR4:** O sistema deve integrar a Meta Marketing API para listar campanhas, visualizar metricas (spend, ROAS, CPA, CTR, impressions, clicks) e exibir alertas automaticos (ROAS abaixo do threshold, budget esgotando).
- **FR5:** O sistema deve integrar a Google Ads API para listar campanhas, visualizar metricas (spend, ROAS, CPA, CTR, impressions, clicks) e exibir alertas automaticos (ROAS abaixo do threshold, budget esgotando).
- **FR6:** O sistema deve fornecer filtros de campanhas por cliente, periodo, status e plataforma (Meta/Google).
- **FR7:** O sistema deve oferecer um modulo de Tarefas com Kanban por status (Backlog, Em andamento, Review, Concluido), campos (titulo, descricao, cliente vinculado, responsavel, prazo, prioridade), filtros (cliente, responsavel, data) e comentarios em tarefas.
- **FR8:** O sistema deve fornecer uma interface para gerenciar workflows do n8n via API REST, incluindo listar, ativar/pausar, executar workflows e visualizar log de execucoes.
- **FR9:** O sistema deve permitir criar triggers de automacao (ex: "quando ROAS cair abaixo de X, executar workflow Y").
- **FR10:** O sistema deve oferecer um modulo de API Connector para registrar APIs externas (URL, auth type, headers), testar conexao e disponibilizar APIs registradas como tools para o agente.
- **FR11:** O sistema deve permitir importacao de dados via upload de CSV/planilhas e via Google Sheets API, com mapeamento de colunas, preview antes de importar e historico de importacoes.
- **FR12:** O sistema deve fornecer uma interface de chat com o agente AI, com streaming via SSE, onde o agente tem acesso a todos os modulos via tool-calling.
- **FR13:** O agente AI deve operar com contexto do workspace do usuario logado, historico de conversas persistido e memoria de longo prazo (Mem0 + Qdrant).
- **FR14:** Todas as operacoes do agente devem ser auditadas e logadas, incluindo tool chamada, input, output e timestamp.
- **FR15:** O agente deve operar com as permissoes do usuario logado (JWT propagado para RLS), nunca usando service_role do Supabase.
- **FR16:** O agente deve ser capaz de executar comandos por texto natural: criar tarefa, buscar metricas, gerar relatorio, disparar automacao, registrar API, importar dados, entre outros.
- **FR17:** O sistema deve implementar autenticacao e autorizacao via Supabase Auth com roles (owner, member).
- **FR18:** Tools com `isDestructive: true` devem exigir confirmacao explicita do usuario antes de execucao pelo agente.

### Non Functional

- **NFR1:** Tempo de resposta da UI deve ser inferior a 200ms para operacoes locais (navegacao, filtros) e inferior a 2s para operacoes que envolvem APIs externas (Meta, Google, n8n).
- **NFR2:** O streaming do agente deve iniciar resposta (primeiro token) em menos de 500ms apos envio da mensagem.
- **NFR3:** O sistema deve suportar operacao single-tenant (apenas Uhuru) no MVP, com design que nao impeca multi-tenancy futura.
- **NFR4:** Todas as queries do agente e da aplicacao devem passar pelo Row Level Security (RLS) do Supabase — nenhum acesso direto ao banco sem RLS.
- **NFR5:** Credenciais de APIs externas (Meta, Google, n8n) devem ser armazenadas de forma segura no Supabase Vault ou como encrypted columns, nunca em plaintext.
- **NFR6:** O sistema deve implementar rate limiting por usuario para chamadas ao agente AI (Claude API) — maximo 30 mensagens/minuto por usuario.
- **NFR7:** Logs de auditoria do agente devem ser retidos por no minimo 90 dias.
- **NFR8:** O sistema deve ser acessivel via navegador moderno (Chrome, Firefox, Edge) em resolucoes desktop (1280px+). Responsividade mobile e P1.
- **NFR9:** O monorepo deve manter build time abaixo de 60s para cada package individual e abaixo de 120s para build completo.
- **NFR10:** O sistema deve ter cobertura de testes minima de 80% para o package agent-harness e 60% para apps/api.
- **NFR11:** Todas as APIs internas (Hono) devem ter validacao de input via Zod schemas.

---

## User Interface Design Goals

### Overall UX Vision

Interface operacional limpa e objetiva, otimizada para produtividade da equipe. O design segue principios de dashboard SaaS moderno: informacao densa sem ser poluida, navegacao previsivel e acesso rapido ao agente AI de qualquer tela. O chat do agente deve estar sempre acessivel (side panel ou FAB), permitindo que o usuario execute operacoes sem sair do contexto atual.

### Key Interaction Paradigms

- **Dashboard-first:** Tela inicial mostra visao consolidada — o usuario ve o estado geral sem precisar navegar
- **Drill-down progressivo:** Dashboard geral → Dashboard por cliente → Detalhes de campanha/tarefa
- **Command palette + Chat:** O agente e acessivel via chat lateral persistente, permitindo operacoes por linguagem natural de qualquer tela
- **Kanban drag-and-drop:** Modulo de tarefas usa interface Kanban interativa
- **Filtros persistentes:** Filtros aplicados (cliente, periodo, plataforma) persistem durante a sessao

### Core Screens and Views

- Login / Auth screen
- Dashboard Geral (home)
- Dashboard por Cliente (drill-down)
- Lista de Clientes + Formulario CRUD
- Campanhas (lista com filtros + detalhes)
- Tarefas (Kanban board)
- Automacoes (lista de workflows n8n + triggers)
- API Connector (registro e teste de APIs)
- Importacao de Dados (upload + mapeamento)
- Chat do Agente (side panel persistente)
- Configuracoes (perfil, integracao de contas)

### Accessibility

WCAG AA — contraste minimo, navegacao por teclado, labels semanticos. Nivel basico adequado para ferramenta interna.

### Branding

Utilizar identidade visual da Uhuru (cores, logo). Detalhes serao definidos pelo @ux-design-expert. Base: shadcn/ui com Tailwind 4, customizado para o brand da Uhuru.

### Target Device and Platforms

Web Responsive — desktop-first (1280px+). Responsividade mobile e P1 (pos-MVP).

---

## Technical Assumptions

### Repository Structure: Monorepo (Turborepo)

```
uhuru-os/
├── apps/
│   ├── web/          # React 19 + Vite + Tailwind 4 + shadcn/ui
│   └── api/          # Bun + Hono (REST API)
├── packages/
│   ├── agent-harness/ # Engine do agente AI
│   ├── shared/        # Types, utils, validators compartilhados
│   └── ui/            # Componentes shadcn/ui customizados (opcional)
├── turbo.json
├── package.json
└── bun.lockb
```

**Rationale:** Monorepo Turborepo permite compartilhar tipos e utilidades entre frontend, API e agent-harness sem overhead de publicacao de packages. Stack identica ao Nexus AI maximiza reuso de conhecimento.

### Service Architecture

Monolito modular dentro do monorepo:
- **apps/web:** SPA React servida por Vite (dev) ou build estatico (prod)
- **apps/api:** Servidor Hono rodando no Bun — todas as rotas da aplicacao
- **packages/agent-harness:** Library consumida pelo apps/api — nao e um servico separado

O agente chama tools que internamente chamam os mesmos endpoints/services do Hono. O agente NUNCA acessa o banco diretamente — todas as operacoes passam pela camada de servico do Hono.

**Decisoes travadas (nao revisar):**

| Decisao | Escolha | Rationale |
|---------|---------|-----------|
| Frontend | React 19 + Vite | SPA simples, sem necessidade de SSR. Vite para DX rapida |
| Styling | Tailwind 4 + shadcn/ui | Componentes prontos, customizaveis, zero runtime CSS |
| Backend | Bun + Hono | Performance nativa, TypeScript-first, API leve |
| Database | Supabase (Postgres + Auth + Realtime + Storage) | Auth integrado, RLS nativo, Realtime para dashboards |
| AI | Claude API (tool-calling) + Mem0 + Qdrant | Tool-calling nativo, memoria de longo prazo vetorial |
| Monorepo | Turborepo | Cache inteligente, builds paralelos |
| Ads APIs | Meta Marketing API + Google Ads API | Integracao direta — sem intermediarios |
| Automacoes | n8n (VPS existente 72.60.9.248) via API REST | Reutiliza infra existente, sem reinventar engine |

### Testing Requirements

- **Unit tests:** Vitest para apps/web e apps/api, cobertura minima 60%
- **Agent harness tests:** Vitest, cobertura minima 80% (critico — e o core do produto)
- **Integration tests:** Testes de integracao para endpoints Hono (supertest ou similar)
- **E2E:** Playwright para fluxos criticos (login, CRUD cliente, chat com agente) — P1
- **Sem testes manuais formais no MVP:** QA automatizado via pipeline

### Additional Technical Assumptions and Requests

- Supabase project sera criado como single-tenant (sem multi-tenancy no MVP)
- JWT do Supabase Auth sera propagado em todas as requests ao Hono e ao agent-harness para RLS
- Realtime do Supabase sera usado para atualizar dashboards sem polling
- Mem0 e Qdrant rodam na VPS existente (72.60.9.248) — nao provisionar nova infra
- Google Ads API requer OAuth 2.0 com refresh token — fluxo de vinculacao na tela de Configuracoes
- Meta Marketing API requer token de longa duracao — renovacao automatica ou manual
- n8n API ja esta disponivel na VPS — endpoint base configuravel

---

## Architecture Overview — Agent Harness

### Principio Central

Cada operacao da plataforma e simultaneamente:
1. Uma rota de UI que o usuario acessa
2. Uma tool disponivel para o agente

Isso garante paridade total entre o que o usuario pode fazer e o que o agente pode fazer.

### Estrutura do Harness

```
packages/agent-harness/
├── engine/           # Loop conversacional (streaming SSE, retry, context compaction)
├── tools/            # Registry + Tool interface + built-in tools
├── context/          # System prompt builder, workspace context, memory (Mem0)
├── hooks/            # pre-tool (permissions, rate limit) + post-tool (audit log)
└── session/          # Persistencia de sessao no Supabase
```

### Tool Interface

```typescript
interface UhuruTool {
  name: string
  description: string
  inputSchema: ZodSchema
  permissions: {
    requiredRole: 'owner' | 'member'
    isReadOnly: boolean
    isDestructive: boolean
  }
  isEnabled(ctx: ToolContext): boolean
  call(input: unknown, ctx: ToolContext): Promise<ToolResult>
}
```

### Seguranca Critica do Agente

1. O agente **NUNCA** usa `service_role` do Supabase
2. Todas as queries passam pelo RLS do usuario logado (JWT propagado)
3. Tools com `isDestructive: true` requerem confirmacao explicita do usuario
4. Todas as chamadas sao auditadas (tool name, input, output, timestamp, user_id)
5. Rate limiting por usuario (30 msg/min)

### Referencias de Arquitetura

O design do harness foi inspirado em:
- **jarmuine/claude-code** (source leak Claude Code 2026-03-31): QueryEngine loop, Tool contract, registry com filtering, context injection, permission model, session compaction, memory system
- **ultraworkers/claw-code** (port Rust): multi-provider API abstraction

---

## Scope

### MVP (P0) — Escopo deste PRD

| # | Modulo | Descricao |
|---|--------|-----------|
| 1 | Dashboard Geral | Visao consolidada de todos os clientes com metricas agregadas |
| 2 | Dashboard por Cliente | Metricas detalhadas, campanhas, tarefas e plano de midia por cliente |
| 3 | Clientes | CRUD completo com vinculacao de contas de ads e documentos |
| 4 | Campanhas | Integracao Meta + Google Ads com filtros e alertas |
| 5 | Tarefas | Kanban com CRUD, filtros, comentarios e vinculacao a clientes |
| 6 | Automacoes | Interface para gerenciar workflows n8n + triggers |
| 7 | API Connector | Registro e teste de APIs externas como tools do agente |
| 8 | Importacao de Dados | Upload CSV/Sheets com mapeamento e preview |
| 9 | AI Agent | Chat com streaming, tool-calling para todos os modulos, auditoria |

### Pos-MVP

| Prioridade | Modulo | Descricao |
|------------|--------|-----------|
| P1 | Relatorios Automaticos | Geracao periodica de relatorios de performance por cliente |
| P1 | Planos de Midia | CRUD de planos de midia com integracao ao dashboard |
| P1 | Portal do Cliente | Acesso read-only para clientes verem suas metricas |
| P1 | Responsividade Mobile | Adaptacao da UI para dispositivos moveis |
| P1 | E2E Tests (Playwright) | Testes end-to-end para fluxos criticos |
| P2 | Financeiro | Controle de faturamento, notas fiscais, receita por cliente |
| P2 | WhatsApp Business | Integracoes com WhatsApp para comunicacao com clientes |
| P2 | Biblioteca de Criativos | Gestao de assets de midia (imagens, videos, copies) |

---

## Users and Personas

### Persona 1: Joao (Owner / Gestor)

- **Papel:** Dono da Uhuru, gestor geral da operacao
- **Necessidades:** Visao consolidada de todos os clientes, alertas proativos de performance, automacao de tarefas repetitivas
- **Uso do agente:** Perguntar "como esta o cliente X?", pedir relatorios, criar tarefas, disparar automacoes
- **Nivel tecnico:** Alto — entende de APIs, automacoes, dados
- **Role no sistema:** `owner` (acesso total)

### Persona 2: Membro da Equipe

- **Papel:** Gestor de trafego, analista, operador
- **Necessidades:** Acesso as campanhas dos clientes que gerencia, criar e atualizar tarefas, consultar metricas
- **Uso do agente:** Pedir metricas especificas, criar tarefas rapidas, consultar status de automacoes
- **Nivel tecnico:** Medio — confortavel com ferramentas digitais, nao necessariamente tecnico
- **Role no sistema:** `member` (acesso filtrado por RLS)

---

## Dependencies and Risks

### Dependencies

| Dependencia | Tipo | Criticidade | Mitigacao |
|-------------|------|-------------|-----------|
| Supabase (Auth, DB, RLS, Realtime, Storage) | Servico externo | ALTA | Supabase e battle-tested, free tier generoso para MVP |
| Claude API (tool-calling) | Servico externo | ALTA | Retry com backoff, graceful degradation (UI funciona sem agente) |
| Meta Marketing API | Servico externo | ALTA | Rate limits agressivos — implementar cache de metricas e retry |
| Google Ads API | Servico externo | ALTA | OAuth 2.0 com refresh token, cache de metricas |
| n8n (VPS 72.60.9.248) | Infra existente | MEDIA | VPS ja rodando — risco e downtime da VPS, nao do n8n |
| Mem0 + Qdrant (VPS) | Infra existente | MEDIA | Ja provisionados na VPS, risco limitado a memoria do agente |
| Bun runtime | Tecnologia | BAIXA | Estavel para producao, compat com Node.js ecosystem |

### Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Rate limits das APIs de ads (Meta/Google) impedirem atualizacao em tempo real | ALTA | MEDIO | Cache agressivo de metricas (refresh a cada 15-30min, nao real-time) |
| Custo da Claude API escalar com uso intensivo do agente | MEDIA | ALTO | Rate limiting por usuario (NFR6), monitoramento de custo, alertas |
| Token de longa duracao do Meta expirar sem aviso | MEDIA | MEDIO | Cron de verificacao de validade + alerta automatico |
| Complexidade do agent harness atrasar MVP | MEDIA | ALTO | Implementar tool-calling basico primeiro, iterar. Harness e o core — nao cortar escopo |
| VPS ficar indisponivel (n8n, Mem0, Qdrant) | BAIXA | ALTO | Monitoramento basico, graceful degradation nos modulos dependentes |
| RLS mal configurado expor dados entre roles | BAIXA | CRITICO | Testes especificos de RLS em cada tabela, review obrigatorio pelo @data-engineer |

---

## MVP Acceptance Criteria

O MVP do Uhuru OS sera considerado aceito quando:

1. **Auth funcional:** Login/logout via Supabase Auth com roles owner e member
2. **Dashboard Geral operacional:** Exibe metricas agregadas de todos os clientes com dados reais de Meta e/ou Google Ads
3. **Dashboard por Cliente operacional:** Drill-down mostra campanhas, metricas e tarefas do cliente selecionado
4. **CRUD de Clientes completo:** Criar, ler, atualizar, deletar clientes com vinculacao de contas de ads
5. **Campanhas com dados reais:** Pelo menos uma integracao (Meta ou Google) retornando metricas reais
6. **Tarefas funcionais:** Kanban operacional com CRUD, filtros e vinculacao a clientes
7. **Automacoes integradas:** Pelo menos 3 workflows do n8n gerenciaveis pela interface
8. **API Connector operacional:** Registro de pelo menos 1 API externa funcional como tool do agente
9. **Importacao de dados:** Upload de CSV com mapeamento e preview funcionando
10. **Agente AI funcional:** Chat com streaming, capaz de executar pelo menos 5 tools diferentes (ex: buscar metricas, criar tarefa, listar clientes, disparar workflow, consultar campanha)
11. **Auditoria completa:** Todas as operacoes do agente logadas com tool, input, output, timestamp
12. **RLS ativo:** Nenhuma rota ou tool do agente bypassa o Row Level Security
13. **Build e testes passando:** `turbo build` e `turbo test` sem erros, cobertura minima atingida

---

## Epic List

### Epic 1: Foundation, Auth and Project Setup

Estabelecer a infraestrutura do monorepo (Turborepo + Bun), configurar Supabase (Auth, schema base, RLS), criar o servidor Hono com health check, e implementar autenticacao completa (login, registro, protecao de rotas). Ao final, a aplicacao tem auth funcional e estrutura pronta para receber os modulos.

### Epic 2: Client Management and Base UI

Implementar o modulo de Clientes (CRUD completo com vinculacao de contas de ads e documentos), layout base da aplicacao (sidebar, topbar, navegacao), e os componentes compartilhados do design system (shadcn/ui customizado). Este epic entrega a primeira entidade de negocio funcional.

### Epic 3: Campaigns Integration (Meta + Google Ads)

Integrar Meta Marketing API e Google Ads API para listar campanhas, exibir metricas e configurar alertas automaticos. Inclui o fluxo de vinculacao OAuth para Google e token management para Meta. Ao final, o sistema exibe dados reais de campanhas.

### Epic 4: Dashboards (General + Per-Client)

Construir o Dashboard Geral (metricas agregadas, cards por cliente, alertas) e o Dashboard por Cliente (drill-down com campanhas, metricas historicas, tarefas). Consome dados dos Epics 2 e 3. Integra Supabase Realtime para atualizacoes.

### Epic 5: Task Management (Kanban)

Implementar o modulo de Tarefas com Kanban board (drag-and-drop), CRUD de tarefas com vinculacao a clientes, filtros, comentarios e campos completos (titulo, descricao, responsavel, prazo, prioridade).

### Epic 6: Automations and n8n Integration

Criar interface para gerenciar workflows do n8n via API REST (listar, ativar/pausar, executar), visualizar logs de execucao e configurar triggers automaticos (condicoes + workflow).

### Epic 7: API Connector and Data Import

Implementar o modulo de API Connector (registro, teste e disponibilizacao como tools) e o modulo de Importacao de Dados (CSV upload, Google Sheets API, mapeamento de colunas, preview, historico).

### Epic 8: AI Agent (Harness, Tools, Chat)

Construir o agent-harness (engine, tool registry, context builder, hooks, session), implementar as built-in tools para todos os modulos anteriores, criar a interface de chat com streaming SSE, e integrar memoria de longo prazo (Mem0 + Qdrant). Este e o epic central do produto.

---

## Epic Details

### Epic 1: Foundation, Auth and Project Setup

**Goal:** Estabelecer toda a infraestrutura tecnica do projeto — monorepo Turborepo, apps (web + api), packages (shared, agent-harness scaffold), Supabase (schema base, Auth, RLS), servidor Hono funcional e autenticacao completa. Ao final deste epic, um usuario pode se registrar, logar, e acessar uma pagina protegida que exibe um health check da API.

#### Story 1.1: Monorepo Scaffold and Base Configuration

**As a** developer,
**I want** a Turborepo monorepo with apps/web (React + Vite + Tailwind 4), apps/api (Bun + Hono), and packages/shared scaffolded,
**so that** I have a working development environment with build, lint, and typecheck commands.

**Acceptance Criteria:**
1. Monorepo inicializado com Turborepo, Bun como package manager
2. `apps/web` configurado com React 19 + Vite + Tailwind 4 + TypeScript, exibindo pagina "Hello Uhuru OS"
3. `apps/api` configurado com Bun + Hono + TypeScript, respondendo `GET /health` com `{ status: "ok" }`
4. `packages/shared` criado com export de tipos basicos (ex: `ApiResponse<T>`)
5. `packages/agent-harness` criado como scaffold vazio (package.json + tsconfig + index.ts vazio)
6. `turbo build`, `turbo lint`, `turbo typecheck` executam sem erros
7. ESLint + Prettier configurados no root com configs compartilhadas
8. `.env.example` documentando todas as variaveis necessarias

#### Story 1.2: Supabase Setup — Schema Base, Auth, and RLS

**As a** developer,
**I want** Supabase configured with Auth (email/password), a base schema with `profiles` table, and RLS policies,
**so that** authentication and authorization are ready for all subsequent modules.

**Acceptance Criteria:**
1. Projeto Supabase criado (ou referencia ao existente) com configuracao documentada
2. Auth configurado para email/password com confirmacao de email desabilitada (MVP)
3. Tabela `profiles` criada com campos: `id` (FK auth.users), `full_name`, `role` (enum: owner, member), `created_at`, `updated_at`
4. Trigger `on_auth_user_created` cria registro automatico em `profiles` com role default `member`
5. RLS habilitado em `profiles` — usuario so ve/edita o proprio perfil; owner ve todos
6. Migration files organizados em `supabase/migrations/`
7. Supabase client configurado em `packages/shared` com tipos gerados via `supabase gen types`

#### Story 1.3: Authentication Flow — Login, Register, and Protected Routes

**As a** user,
**I want** to register, login, and access protected routes,
**so that** I can securely use the platform.

**Acceptance Criteria:**
1. Tela de Login com email/password, validacao de campos, feedback de erros
2. Tela de Registro com nome, email, password, confirmacao de password
3. AuthContext/provider React gerenciando sessao (Supabase onAuthStateChange)
4. Rota protegida `/dashboard` que redireciona para `/login` se nao autenticado
5. Tela `/dashboard` exibe nome do usuario logado e resultado do health check da API
6. Middleware Hono valida JWT do Supabase em rotas protegidas da API
7. Logout funcional que limpa sessao e redireciona para `/login`

---

### Epic 2: Client Management and Base UI

**Goal:** Construir o layout base da aplicacao (sidebar, topbar, navegacao entre modulos), o design system base com shadcn/ui, e o modulo completo de Clientes — primeiro CRUD de negocio, com vinculacao de contas de ads e upload de documentos. Ao final, o usuario navega pela aplicacao e gerencia clientes.

#### Story 2.1: Application Layout — Sidebar, Topbar, and Navigation

**As a** user,
**I want** a consistent application layout with sidebar navigation, topbar with user info, and routing between modules,
**so that** I can navigate the platform intuitively.

**Acceptance Criteria:**
1. Layout base com sidebar (colapsavel), topbar (nome do usuario, avatar, logout) e area de conteudo
2. Sidebar com itens de navegacao: Dashboard, Clientes, Campanhas, Tarefas, Automacoes, API Connector, Importacao
3. React Router configurado com rotas para todos os modulos (paginas placeholder)
4. Navegacao funcional entre todas as rotas
5. Layout responsivo — sidebar colapsa em telas menores
6. Componentes base do shadcn/ui instalados e customizados (Button, Input, Card, Table, Dialog, Sheet, Tabs)

#### Story 2.2: Client Module — CRUD and Ads Account Linking

**As a** user,
**I want** to create, view, edit, and delete clients with their linked ads accounts,
**so that** I can manage my client portfolio.

**Acceptance Criteria:**
1. Tabela `clients` criada: `id`, `name`, `cnpj`, `contact_email`, `contact_phone`, `status` (enum: active, paused, ended), `meta_account_id`, `google_account_id`, `created_at`, `updated_at`, `created_by` (FK profiles)
2. RLS: owner ve todos os clientes; member ve clientes que criou ou que lhe foram atribuidos
3. API Hono: `GET /clients`, `POST /clients`, `PUT /clients/:id`, `DELETE /clients/:id` com validacao Zod
4. Tela de listagem com tabela, busca por nome, filtro por status
5. Formulario de criacao/edicao com todos os campos, validacao frontend
6. Confirmacao antes de deletar
7. Toast/notificacao de sucesso/erro em operacoes

#### Story 2.3: Client Documents — File Upload via Supabase Storage

**As a** user,
**I want** to upload and manage documents (contracts, media plans) for each client,
**so that** all client files are centralized.

**Acceptance Criteria:**
1. Tabela `client_documents`: `id`, `client_id` (FK), `file_name`, `file_path` (Storage), `file_type`, `file_size`, `uploaded_by` (FK profiles), `created_at`
2. RLS: mesmas permissoes da tabela `clients` (quem ve o cliente ve os documentos)
3. API: `POST /clients/:id/documents` (upload), `GET /clients/:id/documents` (listar), `DELETE /clients/:id/documents/:docId`
4. Upload via Supabase Storage com bucket `client-documents`, policy de acesso vinculada ao RLS
5. UI: secao de documentos na tela de detalhe do cliente, com upload drag-and-drop, lista de arquivos e opcao de download/delete

---

### Epic 3: Campaigns Integration (Meta + Google Ads)

**Goal:** Integrar Meta Marketing API e Google Ads API para listar campanhas e exibir metricas reais. Inclui fluxo de autenticacao OAuth para Google, gerenciamento de token para Meta, cache de metricas e alertas automaticos. Ao final, o usuario ve campanhas reais com metricas atualizadas.

#### Story 3.1: Meta Marketing API — Token Management and Campaign Listing

**As a** user,
**I want** to connect my Meta Ads account and see my campaigns with real metrics,
**so that** I can monitor Meta ad performance from Uhuru OS.

**Acceptance Criteria:**
1. Tabela `ad_platform_tokens`: `id`, `client_id` (FK), `platform` (enum: meta, google), `access_token` (encrypted), `refresh_token` (encrypted), `expires_at`, `created_at`, `updated_at`
2. Fluxo de configuracao: usuario insere token de longa duracao do Meta para um cliente
3. API: `GET /clients/:id/campaigns?platform=meta` retorna campanhas com metricas (spend, impressions, clicks, ctr, cpc, roas)
4. Service layer que chama Meta Marketing API com o token do cliente, com retry e tratamento de erros
5. Cache de metricas no Supabase (tabela `campaign_metrics_cache`) com TTL de 30 minutos
6. UI: listagem de campanhas Meta na tela de campanhas, com metricas e status

#### Story 3.2: Google Ads API — OAuth Flow and Campaign Listing

**As a** user,
**I want** to connect my Google Ads account via OAuth and see my campaigns with real metrics,
**so that** I can monitor Google ad performance from Uhuru OS.

**Acceptance Criteria:**
1. Fluxo OAuth 2.0 completo: botao "Conectar Google Ads" → redirect OAuth → callback → salva tokens em `ad_platform_tokens`
2. Refresh token automatico quando access_token expira
3. API: `GET /clients/:id/campaigns?platform=google` retorna campanhas com metricas (spend, impressions, clicks, ctr, cpc, roas)
4. Service layer que chama Google Ads API com os tokens do cliente
5. Cache de metricas compartilhado (`campaign_metrics_cache`) com TTL de 30 minutos
6. UI: listagem de campanhas Google na tela de campanhas, com metricas e status

#### Story 3.3: Campaign Alerts — Threshold-Based Notifications

**As a** user,
**I want** automatic alerts when campaign metrics cross defined thresholds (e.g., ROAS below target, budget exhausting),
**so that** I can react quickly to performance issues.

**Acceptance Criteria:**
1. Tabela `alert_rules`: `id`, `client_id` (FK), `metric` (enum: roas, spend, ctr, cpc), `operator` (enum: below, above), `threshold` (numeric), `is_active`, `created_by`, `created_at`
2. Tabela `alerts`: `id`, `alert_rule_id` (FK), `campaign_id`, `current_value`, `triggered_at`, `acknowledged_at`, `acknowledged_by`
3. API: CRUD de `alert_rules` por cliente
4. Verificacao de thresholds a cada refresh de metricas (quando cache expira e busca novos dados)
5. UI: badge de alertas no topbar, lista de alertas com opcao de acknowledge
6. Alerta de budget esgotando: quando spend >= 90% do daily budget

---

### Epic 4: Dashboards (General + Per-Client)

**Goal:** Construir os dashboards que sao a experiencia central da plataforma — Dashboard Geral com visao consolidada de todos os clientes e Dashboard por Cliente com drill-down detalhado. Consome dados dos Epics 2 e 3. Ao final, o usuario ve o estado geral da operacao e pode mergulhar nos detalhes de cada cliente.

#### Story 4.1: General Dashboard — Aggregated Metrics and Client Cards

**As a** user,
**I want** a general dashboard showing aggregated metrics across all clients and per-client status cards,
**so that** I can see the overall health of the operation at a glance.

**Acceptance Criteria:**
1. Metricas agregadas no topo: total spend (periodo), ROAS medio ponderado, total de clientes ativos, total de alertas ativos
2. Cards por cliente: nome, status, spend do periodo, ROAS, numero de campanhas ativas, numero de alertas
3. Filtro de periodo (7d, 30d, 90d, custom)
4. Cards clicaveis que navegam para o Dashboard do Cliente
5. Dados consumidos das APIs de campanhas e cache de metricas
6. Loading states e empty states adequados

#### Story 4.2: Per-Client Dashboard — Detailed Metrics and Drill-Down

**As a** user,
**I want** a detailed dashboard for each client showing campaigns, metrics history, tasks, and alerts,
**so that** I can deeply understand each client's performance.

**Acceptance Criteria:**
1. Header com nome do cliente, status, contas de ads vinculadas
2. Metricas do cliente: spend, ROAS, CPA, CTR (com comparacao vs periodo anterior)
3. Lista de campanhas ativas (Meta + Google) com metricas individuais
4. Grafico de historico de performance (spend e ROAS ao longo do tempo)
5. Secao de tarefas vinculadas ao cliente (preview — clicavel para Kanban filtrado)
6. Secao de alertas ativos do cliente
7. Filtro de periodo consistente com o Dashboard Geral
8. Supabase Realtime: quando metricas sao atualizadas no cache, dashboard reflete sem refresh manual

---

### Epic 5: Task Management (Kanban)

**Goal:** Implementar o modulo de gestao de tarefas com interface Kanban, CRUD completo, filtros avancados e comentarios. As tarefas sao vinculadas a clientes, permitindo integracao com dashboards. Ao final, a equipe gerencia todas as tarefas operacionais na plataforma.

#### Story 5.1: Task Module — CRUD and Kanban Board

**As a** user,
**I want** a Kanban board to manage tasks with drag-and-drop status changes,
**so that** I can organize and track operational work.

**Acceptance Criteria:**
1. Tabela `tasks`: `id`, `title`, `description`, `client_id` (FK nullable), `assigned_to` (FK profiles nullable), `status` (enum: backlog, in_progress, review, done), `priority` (enum: low, medium, high, urgent), `due_date`, `created_by` (FK profiles), `created_at`, `updated_at`
2. RLS: owner ve todas; member ve tarefas que criou ou que lhe foram atribuidas
3. API: CRUD completo com validacao Zod
4. UI: Kanban com 4 colunas (Backlog, Em andamento, Review, Concluido)
5. Drag-and-drop entre colunas atualiza status via API
6. Formulario de criacao/edicao com todos os campos
7. Filtros: por cliente, responsavel, prioridade, data

#### Story 5.2: Task Comments

**As a** user,
**I want** to add comments to tasks,
**so that** I can discuss and document decisions related to each task.

**Acceptance Criteria:**
1. Tabela `task_comments`: `id`, `task_id` (FK), `author_id` (FK profiles), `content` (text), `created_at`
2. RLS: quem ve a task ve os comentarios
3. API: `POST /tasks/:id/comments`, `GET /tasks/:id/comments`
4. UI: secao de comentarios no detalhe da tarefa, com input de texto e lista cronologica
5. Autor e timestamp exibidos em cada comentario

---

### Epic 6: Automations and n8n Integration

**Goal:** Criar interface para gerenciar workflows do n8n existente na VPS via API REST, visualizar logs de execucao e configurar triggers automaticos baseados em condicoes de metricas. Ao final, o usuario controla automacoes sem acessar o n8n diretamente.

#### Story 6.1: n8n Workflow Management Interface

**As a** user,
**I want** to list, activate, pause, and execute n8n workflows from Uhuru OS,
**so that** I can manage automations without accessing n8n directly.

**Acceptance Criteria:**
1. Configuracao: endpoint base do n8n e API key armazenados de forma segura (Supabase Vault ou env var)
2. API proxy: `GET /automations/workflows` (lista), `POST /automations/workflows/:id/activate`, `POST /automations/workflows/:id/deactivate`, `POST /automations/workflows/:id/execute`
3. Service layer que chama n8n API com tratamento de erros e timeout
4. UI: lista de workflows com nome, status (ativo/inativo), ultima execucao
5. Botoes de acao: ativar, pausar, executar manualmente
6. Confirmacao antes de executar workflow manualmente

#### Story 6.2: Automation Triggers

**As a** user,
**I want** to create triggers that automatically execute workflows when conditions are met (e.g., ROAS drops below threshold),
**so that** the platform reacts automatically to performance changes.

**Acceptance Criteria:**
1. Tabela `automation_triggers`: `id`, `name`, `client_id` (FK nullable), `condition_metric` (enum: roas, spend, ctr, cpc), `condition_operator` (enum: below, above), `condition_value` (numeric), `workflow_id` (string — n8n workflow ID), `is_active`, `last_triggered_at`, `created_by`, `created_at`
2. API: CRUD de triggers
3. Verificacao de condicoes executada junto com o refresh de metricas (quando cache atualiza)
4. Quando condicao e atingida: executa workflow via n8n API, registra em `automation_trigger_logs`
5. UI: formulario de criacao/edicao de trigger, lista de triggers ativos, historico de execucoes

---

### Epic 7: API Connector and Data Import

**Goal:** Implementar o modulo de API Connector (registro de APIs externas como tools para o agente) e o modulo de Importacao de Dados (CSV e Google Sheets). Estes modulos expandem a plataforma para ser extensivel e alimentavel com dados externos.

#### Story 7.1: API Connector — Register, Test, and Expose as Tools

**As a** user,
**I want** to register external APIs with their auth configuration and test connectivity,
**so that** the AI agent can call any registered API as a tool.

**Acceptance Criteria:**
1. Tabela `api_connectors`: `id`, `name`, `base_url`, `auth_type` (enum: none, api_key, bearer, basic, oauth2), `auth_config` (jsonb encrypted), `headers` (jsonb), `is_active`, `created_by`, `created_at`, `updated_at`
2. API: CRUD de connectors com validacao Zod
3. Endpoint `POST /api-connectors/:id/test` que faz uma request de teste (GET na base_url) e retorna status
4. UI: formulario de registro com campos dinamicos baseados no auth_type, botao "Testar Conexao", lista de APIs registradas
5. Cada API registrada e automaticamente disponivel como tool para o agente (via tool registry no harness)

#### Story 7.2: Data Import — CSV Upload and Google Sheets

**As a** user,
**I want** to import data from CSV files and Google Sheets into the platform,
**so that** I can onboard historical data and external sources.

**Acceptance Criteria:**
1. Tabela `import_jobs`: `id`, `source_type` (enum: csv, google_sheets), `source_reference` (file path ou Sheet URL), `target_table`, `column_mapping` (jsonb), `status` (enum: pending, processing, completed, failed), `rows_imported`, `errors` (jsonb), `created_by`, `created_at`
2. Upload CSV: selecao de arquivo, deteccao automatica de colunas, interface de mapeamento (coluna CSV → campo do sistema)
3. Preview: exibir primeiras 5 linhas com o mapeamento aplicado antes de confirmar
4. Google Sheets: inserir URL da Sheet, autenticar via OAuth (ou API key), mesma interface de mapeamento
5. Historico de importacoes com status, linhas importadas, erros
6. Tratamento de erros: linhas com erro sao logadas mas nao bloqueiam a importacao

---

### Epic 8: AI Agent (Harness, Tools, Chat)

**Goal:** Construir o nucleo do Uhuru OS — o agente AI. Implementar o agent-harness (engine, tool registry, context, hooks, session), criar tools para todos os modulos anteriores, interface de chat com streaming, e integracao com memoria de longo prazo. Ao final, o usuario interage com um agente que opera toda a plataforma por linguagem natural.

#### Story 8.1: Agent Harness — Engine and Tool Registry

**As a** developer,
**I want** the agent harness engine with tool registry, context builder, and session management,
**so that** the AI agent can process conversations and call tools.

**Acceptance Criteria:**
1. Engine implementa loop conversacional: recebe mensagem → monta contexto (system prompt + workspace) → chama Claude API → processa tool_use → executa tool → retorna resultado → loop ate text response
2. Tool registry: registro de tools implementando `UhuruTool` interface, filtering por permissoes e `isEnabled`
3. Context builder: monta system prompt com descricao do workspace, usuario logado, tools disponiveis, historico da conversa
4. Session management: persistencia de conversas no Supabase (tabela `agent_sessions` com mensagens em jsonb)
5. Streaming via SSE: resposta do agente e streamed para o cliente em tempo real
6. Testes unitarios para engine loop, tool registry e context builder (cobertura >= 80%)

#### Story 8.2: Agent Built-in Tools — All Modules

**As a** user,
**I want** the AI agent to have tools for all platform modules,
**so that** I can operate the entire platform via natural language.

**Acceptance Criteria:**
1. Tools implementadas para todos os modulos: `list_clients`, `get_client`, `create_client`, `update_client`, `list_campaigns`, `get_campaign_metrics`, `create_task`, `update_task`, `list_tasks`, `list_workflows`, `execute_workflow`, `create_trigger`, `import_data`, `call_api_connector`
2. Cada tool usa a mesma camada de servico das rotas Hono (nao acessa DB diretamente)
3. Cada tool tem `inputSchema` Zod, `permissions` corretas, e `isDestructive` marcado quando aplicavel
4. Tools destrutivas (delete_client, execute_workflow) requerem confirmacao
5. Audit log: toda execucao de tool grava em `agent_audit_logs` (tabela: `id`, `session_id`, `tool_name`, `input`, `output`, `user_id`, `created_at`)
6. Testes unitarios para cada tool

#### Story 8.3: Agent Chat Interface and Memory Integration

**As a** user,
**I want** a chat interface to interact with the AI agent, with persistent memory across conversations,
**so that** the agent remembers context and provides increasingly useful assistance.

**Acceptance Criteria:**
1. Chat side panel acessivel de qualquer tela (botao flutuante ou icone no topbar)
2. Interface de chat com historico de mensagens, input de texto, indicador de "agente pensando"
3. Streaming: resposta do agente aparece token a token via SSE
4. Tool calls visiveis na conversa: quando o agente usa uma tool, exibir nome da tool e resultado de forma colapsavel
5. Confirmacao de tools destrutivas: quando o agente quer executar tool com `isDestructive: true`, exibir prompt de confirmacao na UI
6. Historico de conversas: sessoes anteriores listadas e navegaveis
7. Memoria de longo prazo: integracao com Mem0 (VPS) para armazenar e recuperar informacoes persistentes entre sessoes
8. Integracao com Qdrant (VPS) para busca semantica no historico de conversas e documentos

#### Story 8.4: Agent Hooks — Permissions, Rate Limiting, and Audit

**As a** platform operator,
**I want** the agent to respect user permissions, rate limits, and full audit logging,
**so that** the platform is secure and usage is traceable.

**Acceptance Criteria:**
1. Pre-tool hook: verifica se o usuario tem a role necessaria para a tool (owner vs member)
2. Pre-tool hook: rate limiting — rejeita se usuario excedeu 30 msg/min
3. Pre-tool hook: tools com `isDestructive: true` retornam `needs_confirmation` em vez de executar
4. Post-tool hook: grava audit log em `agent_audit_logs`
5. JWT do usuario logado propagado para o contexto do agente — todas as queries respeitam RLS
6. Testes para cada hook (permissao negada, rate limit excedido, audit gravado)

---

## Checklist Results Report

*A ser executado apos revisao do PRD pela equipe.*

---

## Next Steps

### UX Expert Prompt

> @ux-design-expert: Analise o PRD do Uhuru OS em `D:/workspace/projects/uhuru-os/docs/prd.md`. Crie o design system base (tokens, componentes, layout) e wireframes das telas core: Dashboard Geral, Dashboard por Cliente, Clientes (lista + form), Kanban de Tarefas e Chat do Agente. Stack: React 19 + Tailwind 4 + shadcn/ui. Foco em produtividade operacional e acesso rapido ao agente AI.

### Architect Prompt

> @architect: Analise o PRD do Uhuru OS em `D:/workspace/projects/uhuru-os/docs/prd.md`. Crie a arquitetura detalhada cobrindo: schema completo do Supabase (todas as tabelas, RLS, triggers), estrutura do monorepo Turborepo, API design (Hono routes), agent-harness architecture (engine, tools, context, hooks), integracao com Meta/Google APIs, e integracao com n8n/Mem0/Qdrant na VPS. Stack travada: React 19 + Vite + Tailwind 4, Bun + Hono, Supabase, Claude API + Mem0 + Qdrant.
