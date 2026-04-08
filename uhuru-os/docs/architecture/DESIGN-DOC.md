# Uhuru OS -- Design Doc Tecnico

**Versao:** 1.0
**Data:** 2026-04-08
**Autor:** Aria (@architect)
**Status:** Draft -- pendente review @data-engineer (DDL), @qa (security review)

---

## 1. Visao Arquitetural

### 1.1 Principios

1. **API-first, Agent-second:** Toda operacao existe como endpoint Hono antes de virar tool do agente. O agente e consumidor da API, nunca bypass.
2. **RLS everywhere:** Nenhum acesso ao banco sem Row Level Security. O agente herda as permissoes do usuario logado via JWT propagado.
3. **Single-tenant MVP:** Sem multi-tenancy complexo. RLS implementado por roles (owner/member), nao por tenant_id.
4. **Boring technology:** Stack moderna mas estavel. Sem experimentacao no core path.
5. **Graceful degradation:** Se o agente AI falhar (Claude API down), a plataforma funciona normalmente -- o agente e uma camada sobre a UI, nao a unica via.
6. **Cache-heavy para Ads APIs:** Meta e Google tem rate limits agressivos. Metricas sao cacheadas e refreshed em background, nunca on-demand do usuario.
7. **Reutilizar infra existente:** n8n, Mem0, Qdrant ja rodam na VPS (72.60.9.248). Zero provisioning novo para esses servicos.

### 1.2 Diagrama de Arquitetura

```
                              +------------------+
                              |   Browser (SPA)  |
                              |  React 19 + Vite |
                              +--------+---------+
                                       |
                                  HTTPS/WSS
                                       |
                              +--------+---------+
                              |   apps/api       |
                              |  Bun + Hono      |
                              |  REST + SSE      |
                              +--+----+----+-----+
                                 |    |    |
                    +------------+    |    +------------+
                    |                 |                 |
           +--------+------+  +------+-------+  +-----+--------+
           | Supabase      |  | agent-harness|  | External APIs|
           | - Auth (JWT)  |  | (library)    |  | - Meta Ads   |
           | - Postgres    |  | - Engine     |  | - Google Ads |
           | - Realtime    |  | - Tools      |  | - n8n (VPS)  |
           | - Storage     |  | - Context    |  +-----+--------+
           | - Vault       |  | - Hooks      |        |
           +---------------+  | - Session    |  +-----+--------+
                              +------+-------+  | VPS Services |
                                     |          | - Mem0       |
                                     +----------+ - Qdrant     |
                                                +--------------+
```

### 1.3 Fluxo de Dados Principal

```
1. Usuario envia mensagem no chat
2. POST /agent/chat (JWT no header Authorization)
3. Hono middleware valida JWT, extrai user context
4. agent-harness.engine recebe mensagem
5. Context builder monta system prompt (tools, workspace, user, memory)
6. Claude API chamada com streaming
7. Claude retorna tool_use → pre-hook (permission, rate limit)
8. Tool executa (chama service layer Hono interno) → post-hook (audit)
9. Resultado retornado ao Claude → loop ate text response
10. SSE stream envia tokens ao frontend em tempo real
```

---

## 2. Estrutura do Monorepo

```
uhuru-os/
├── apps/
│   ├── web/                          # SPA React
│   │   ├── src/
│   │   │   ├── components/           # Componentes de UI (shadcn + custom)
│   │   │   │   ├── ui/              # shadcn/ui components
│   │   │   │   ├── layout/          # Sidebar, Topbar, AppShell
│   │   │   │   ├── dashboard/       # Dashboard widgets, cards, charts
│   │   │   │   ├── clients/         # Client CRUD components
│   │   │   │   ├── campaigns/       # Campaign listing, filters
│   │   │   │   ├── tasks/           # Kanban board, task cards
│   │   │   │   ├── automations/     # Workflow list, trigger form
│   │   │   │   ├── agent/           # Chat panel, message bubbles, tool display
│   │   │   │   ├── import/          # CSV upload, column mapper
│   │   │   │   └── api-connector/   # API registration form
│   │   │   ├── hooks/               # React hooks (useAuth, useAgent, useRealtime, etc.)
│   │   │   ├── lib/                 # Supabase client, API client, utils
│   │   │   ├── pages/              # Route pages (Dashboard, Clients, etc.)
│   │   │   ├── providers/          # AuthProvider, QueryProvider, ThemeProvider
│   │   │   ├── routes/             # React Router config
│   │   │   ├── styles/             # Tailwind config, global styles
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Backend Hono
│       ├── src/
│       │   ├── routes/              # Hono route handlers
│       │   │   ├── auth.ts          # Login, register, refresh
│       │   │   ├── clients.ts       # CRUD clients
│       │   │   ├── campaigns.ts     # Campaign listing, metrics
│       │   │   ├── tasks.ts         # CRUD tasks + comments
│       │   │   ├── automations.ts   # n8n proxy + triggers
│       │   │   ├── api-connectors.ts # CRUD API connectors
│       │   │   ├── import.ts        # CSV/Sheets import
│       │   │   ├── agent.ts         # POST /agent/chat (SSE)
│       │   │   ├── alerts.ts        # Alert rules + alerts
│       │   │   └── health.ts        # GET /health
│       │   ├── services/            # Business logic layer
│       │   │   ├── client.service.ts
│       │   │   ├── campaign.service.ts
│       │   │   ├── task.service.ts
│       │   │   ├── automation.service.ts
│       │   │   ├── api-connector.service.ts
│       │   │   ├── import.service.ts
│       │   │   ├── alert.service.ts
│       │   │   └── metrics-cache.service.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts          # JWT validation via Supabase
│       │   │   ├── rate-limit.ts    # Per-user rate limiting
│       │   │   ├── validate.ts      # Zod schema validation
│       │   │   └── error-handler.ts # Global error handler
│       │   ├── lib/
│       │   │   ├── supabase.ts      # Supabase client factory (user JWT)
│       │   │   ├── meta-ads.ts      # Meta Marketing API client
│       │   │   ├── google-ads.ts    # Google Ads API client
│       │   │   ├── n8n.ts           # n8n API client
│       │   │   └── mem0.ts          # Mem0 client
│       │   ├── index.ts             # Hono app entrypoint
│       │   └── env.ts               # Environment validation (Zod)
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── agent-harness/                # Agent AI engine
│   │   ├── src/
│   │   │   ├── engine/
│   │   │   │   ├── conversation.ts  # Main loop: msg → LLM → tools → response
│   │   │   │   ├── streaming.ts     # SSE encoding/transport
│   │   │   │   ├── compaction.ts    # Context window management (>80k → compact)
│   │   │   │   └── retry.ts        # Error categorization + exponential backoff
│   │   │   ├── tools/
│   │   │   │   ├── types.ts         # UhuruTool interface
│   │   │   │   ├── registry.ts      # Discovery, assembly, role-based filtering
│   │   │   │   ├── permissions.ts   # allow/deny/ask rules per role
│   │   │   │   └── built-in/        # One file per tool (list-clients.ts, etc.)
│   │   │   ├── context/
│   │   │   │   ├── system-prompt.ts # Hierarchical system prompt builder
│   │   │   │   ├── workspace.ts     # Platform state injection
│   │   │   │   ├── user.ts          # User profile + role context
│   │   │   │   └── memory.ts        # Mem0 + Qdrant memory retrieval
│   │   │   ├── hooks/
│   │   │   │   ├── pre-tool.ts      # Permission check, rate limit, destructive guard
│   │   │   │   └── post-tool.ts     # Audit log, metrics
│   │   │   └── session/
│   │   │       ├── store.ts         # Session CRUD in Supabase
│   │   │       └── history.ts       # Conversation history retrieval
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── shared/                       # Shared types, utils, validators
│   │   ├── src/
│   │   │   ├── types/               # Shared TypeScript types
│   │   │   │   ├── api.ts           # ApiResponse<T>, ApiError, Pagination
│   │   │   │   ├── database.ts      # Generated Supabase types (supabase gen types)
│   │   │   │   ├── agent.ts         # AgentMessage, ToolResult, SessionState
│   │   │   │   └── domain.ts        # Client, Campaign, Task, etc. domain types
│   │   │   ├── validators/          # Shared Zod schemas
│   │   │   │   ├── client.ts
│   │   │   │   ├── task.ts
│   │   │   │   ├── campaign.ts
│   │   │   │   └── common.ts        # Pagination, date range, etc.
│   │   │   └── utils/               # Shared utilities
│   │   │       ├── date.ts
│   │   │       ├── currency.ts
│   │   │       └── metrics.ts       # ROAS calculation, aggregation helpers
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── ui/                           # shadcn/ui customized (optional)
│       └── ... (if needed beyond apps/web/src/components/ui)
│
├── supabase/
│   ├── migrations/                   # Ordered SQL migrations
│   ├── seed.sql                      # Development seed data
│   └── config.toml                   # Supabase local config
│
├── turbo.json                        # Turborepo pipeline config
├── package.json                      # Root workspace config
├── bun.lockb
├── .env.example
├── docker-compose.yml                # Local dev (Supabase local, optional)
└── tsconfig.base.json                # Shared TypeScript config
```

### 2.1 Dependencias entre Packages

```
apps/web ──depends on──► packages/shared (types, validators)
apps/web ──depends on──► packages/ui (if used)

apps/api ──depends on──► packages/shared (types, validators)
apps/api ──depends on──► packages/agent-harness (agent engine)

packages/agent-harness ──depends on──► packages/shared (types)
```

### 2.2 Turborepo Pipeline

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## 3. Schema do Banco de Dados

> **NOTA:** O DDL completo sera produzido por @data-engineer a partir desta especificacao. Esta secao define a arquitetura de dados; @data-engineer implementa o SQL com indices, constraints exatas e triggers.

### 3.1 Diagrama de Entidades

```
profiles ◄─── clients (created_by)
    │              │
    │              ├──► client_documents
    │              ├──► ad_platform_tokens
    │              ├──► alert_rules ──► alerts
    │              ├──► automation_triggers ──► automation_trigger_logs
    │              └──► tasks ──► task_comments
    │
    ├──► agent_sessions ──► agent_audit_logs
    ├──► api_connectors
    └──► import_jobs

campaign_metrics_cache (standalone, populated by background refresh)
```

### 3.2 Tabelas

#### profiles
Extensao de auth.users com dados de perfil e role.

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, FK auth.users(id) ON DELETE CASCADE | |
| full_name | text | NOT NULL | |
| role | text | NOT NULL, CHECK (role IN ('owner', 'member')), DEFAULT 'member' | |
| avatar_url | text | NULLABLE | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Trigger:** `on_auth_user_created` -- insere registro em profiles com role='member' quando usuario se registra.

#### clients

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | text | NOT NULL | |
| cnpj | text | NULLABLE | Formato brasileiro XX.XXX.XXX/XXXX-XX |
| contact_email | text | NULLABLE | |
| contact_phone | text | NULLABLE | |
| status | text | NOT NULL, CHECK (status IN ('active', 'paused', 'ended')), DEFAULT 'active' | |
| meta_account_id | text | NULLABLE | Meta Ads account ID |
| google_account_id | text | NULLABLE | Google Ads account ID (CID) |
| created_by | uuid | NOT NULL, FK profiles(id) | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indices:** `idx_clients_status`, `idx_clients_created_by`

#### client_documents

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| client_id | uuid | NOT NULL, FK clients(id) ON DELETE CASCADE | |
| file_name | text | NOT NULL | |
| file_path | text | NOT NULL | Path no Supabase Storage |
| file_type | text | NOT NULL | MIME type |
| file_size | bigint | NOT NULL | Bytes |
| uploaded_by | uuid | NOT NULL, FK profiles(id) | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

#### ad_platform_tokens

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| client_id | uuid | NOT NULL, FK clients(id) ON DELETE CASCADE | |
| platform | text | NOT NULL, CHECK (platform IN ('meta', 'google')) | |
| access_token | text | NOT NULL | Encrypted via Supabase Vault / pgcrypto |
| refresh_token | text | NULLABLE | Usado pelo Google; Meta usa long-lived token |
| expires_at | timestamptz | NULLABLE | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Unique:** `(client_id, platform)` -- um token por plataforma por cliente.

#### campaign_metrics_cache

Tabela de cache de metricas. Atualizada por background job, consumida pelos dashboards.

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| client_id | uuid | NOT NULL, FK clients(id) ON DELETE CASCADE | |
| platform | text | NOT NULL, CHECK (platform IN ('meta', 'google')) | |
| campaign_id | text | NOT NULL | ID externo na plataforma de ads |
| campaign_name | text | NOT NULL | |
| campaign_status | text | NOT NULL | active, paused, etc. |
| date | date | NOT NULL | Dia da metrica |
| spend | numeric(12,2) | NOT NULL, DEFAULT 0 | |
| impressions | bigint | NOT NULL, DEFAULT 0 | |
| clicks | bigint | NOT NULL, DEFAULT 0 | |
| ctr | numeric(8,4) | NOT NULL, DEFAULT 0 | |
| cpc | numeric(10,2) | NOT NULL, DEFAULT 0 | |
| conversions | integer | NOT NULL, DEFAULT 0 | |
| revenue | numeric(12,2) | NOT NULL, DEFAULT 0 | |
| roas | numeric(8,4) | NOT NULL, DEFAULT 0 | |
| fetched_at | timestamptz | NOT NULL, DEFAULT now() | Quando o cache foi populado |

**Unique:** `(client_id, platform, campaign_id, date)` -- upsert-friendly
**Indices:** `idx_cache_client_date`, `idx_cache_client_platform`

#### alert_rules

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| client_id | uuid | NOT NULL, FK clients(id) ON DELETE CASCADE | |
| metric | text | NOT NULL, CHECK (metric IN ('roas', 'spend', 'ctr', 'cpc')) | |
| operator | text | NOT NULL, CHECK (operator IN ('below', 'above')) | |
| threshold | numeric | NOT NULL | |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_by | uuid | NOT NULL, FK profiles(id) | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

#### alerts

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| alert_rule_id | uuid | NOT NULL, FK alert_rules(id) ON DELETE CASCADE | |
| campaign_id | text | NOT NULL | ID externo |
| current_value | numeric | NOT NULL | |
| triggered_at | timestamptz | NOT NULL, DEFAULT now() | |
| acknowledged_at | timestamptz | NULLABLE | |
| acknowledged_by | uuid | NULLABLE, FK profiles(id) | |

**Indice:** `idx_alerts_unacknowledged` (WHERE acknowledged_at IS NULL)

#### tasks

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| title | text | NOT NULL | |
| description | text | NULLABLE | |
| client_id | uuid | NULLABLE, FK clients(id) ON DELETE SET NULL | |
| assigned_to | uuid | NULLABLE, FK profiles(id) ON DELETE SET NULL | |
| status | text | NOT NULL, CHECK (status IN ('backlog', 'in_progress', 'review', 'done')), DEFAULT 'backlog' | |
| priority | text | NOT NULL, CHECK (priority IN ('low', 'medium', 'high', 'urgent')), DEFAULT 'medium' | |
| due_date | date | NULLABLE | |
| created_by | uuid | NOT NULL, FK profiles(id) | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indices:** `idx_tasks_status`, `idx_tasks_client`, `idx_tasks_assigned`

#### task_comments

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| task_id | uuid | NOT NULL, FK tasks(id) ON DELETE CASCADE | |
| author_id | uuid | NOT NULL, FK profiles(id) | |
| content | text | NOT NULL | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

#### automation_triggers

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | text | NOT NULL | |
| client_id | uuid | NULLABLE, FK clients(id) ON DELETE CASCADE | Null = todos os clientes |
| condition_metric | text | NOT NULL, CHECK (condition_metric IN ('roas', 'spend', 'ctr', 'cpc')) | |
| condition_operator | text | NOT NULL, CHECK (condition_operator IN ('below', 'above')) | |
| condition_value | numeric | NOT NULL | |
| workflow_id | text | NOT NULL | n8n workflow ID |
| is_active | boolean | NOT NULL, DEFAULT true | |
| last_triggered_at | timestamptz | NULLABLE | |
| created_by | uuid | NOT NULL, FK profiles(id) | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

#### automation_trigger_logs

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| trigger_id | uuid | NOT NULL, FK automation_triggers(id) ON DELETE CASCADE | |
| campaign_id | text | NOT NULL | |
| metric_value | numeric | NOT NULL | Valor que disparou o trigger |
| workflow_execution_id | text | NULLABLE | ID da execucao no n8n |
| status | text | NOT NULL, CHECK (status IN ('success', 'failed')) | |
| error_message | text | NULLABLE | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

#### api_connectors

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | text | NOT NULL | |
| base_url | text | NOT NULL | |
| auth_type | text | NOT NULL, CHECK (auth_type IN ('none', 'api_key', 'bearer', 'basic', 'oauth2')) | |
| auth_config | jsonb | NULLABLE | Encrypted. Conteudo depende do auth_type |
| headers | jsonb | NULLABLE | Headers customizados |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_by | uuid | NOT NULL, FK profiles(id) | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

#### import_jobs

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| source_type | text | NOT NULL, CHECK (source_type IN ('csv', 'google_sheets')) | |
| source_reference | text | NOT NULL | File path (Storage) ou Sheet URL |
| target_table | text | NOT NULL | Tabela destino |
| column_mapping | jsonb | NOT NULL | { csv_col: db_col } |
| status | text | NOT NULL, CHECK (status IN ('pending', 'processing', 'completed', 'failed')), DEFAULT 'pending' | |
| rows_imported | integer | NOT NULL, DEFAULT 0 | |
| errors | jsonb | NULLABLE | Array de erros por linha |
| created_by | uuid | NOT NULL, FK profiles(id) | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

#### agent_sessions

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK profiles(id) ON DELETE CASCADE | |
| title | text | NULLABLE | Auto-gerado a partir da primeira mensagem |
| messages | jsonb | NOT NULL, DEFAULT '[]' | Array de {role, content, tool_use, tool_result, timestamp} |
| token_count | integer | NOT NULL, DEFAULT 0 | Para tracking de context window |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indice:** `idx_sessions_user_active` (user_id, is_active)

#### agent_audit_logs

| Campo | Tipo | Constraints | Notas |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| session_id | uuid | NOT NULL, FK agent_sessions(id) ON DELETE CASCADE | |
| tool_name | text | NOT NULL | |
| input | jsonb | NOT NULL | Input enviado para a tool |
| output | jsonb | NOT NULL | Output retornado pela tool |
| duration_ms | integer | NOT NULL | Tempo de execucao |
| user_id | uuid | NOT NULL, FK profiles(id) | Denormalizado para queries rapidas |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indice:** `idx_audit_user_created`, `idx_audit_session`
**Retencao:** 90 dias minimo (NFR7). Implementar via pg_cron ou cron externo.

### 3.3 Estrategia de RLS

Modelo single-tenant com dois roles: `owner` (acesso total) e `member` (acesso restrito).

```sql
-- Funcao helper para extrair role do JWT
CREATE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Policies por tabela:**

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | Own row OR owner | N/A (trigger) | Own row | N/A |
| clients | Owner: all. Member: created_by = uid OR assigned tasks | Auth'd | Owner: all. Member: created_by = uid | Owner only |
| client_documents | Same as parent client | Auth'd, owns client access | N/A | Owner OR uploaded_by = uid |
| ad_platform_tokens | Same as parent client | Owner only | Owner only | Owner only |
| campaign_metrics_cache | Same as parent client | Service only (via function) | Service only | Service only |
| alert_rules | Same as parent client | Auth'd, owns client access | Creator OR owner | Creator OR owner |
| alerts | Same as parent alert_rule | Service only | Auth'd (acknowledge) | Owner only |
| tasks | Owner: all. Member: created_by = uid OR assigned_to = uid | Auth'd | Owner: all. Member: own tasks | Owner OR created_by = uid |
| task_comments | Same as parent task | Auth'd, has task access | Author only | Author OR owner |
| automation_triggers | Owner: all. Member: read only | Owner only | Owner only | Owner only |
| automation_trigger_logs | Same as parent trigger | Service only | N/A | Owner only |
| api_connectors | Owner: all. Member: read if active | Owner only | Owner only | Owner only |
| import_jobs | Creator OR owner | Auth'd | Creator only (status) | Owner only |
| agent_sessions | Own sessions | Auth'd | Own sessions | Own sessions |
| agent_audit_logs | Owner: all. Member: own logs | Service only (via hook) | N/A | N/A |

**Nota sobre `campaign_metrics_cache` e `alerts`:** Insercoes nestas tabelas sao feitas por funcoes `SECURITY DEFINER` chamadas pelo service layer quando o cache e refreshed. O RLS para SELECT segue o mesmo padrao da tabela `clients` pai.

### 3.4 Supabase Storage Buckets

| Bucket | Acesso | Politica |
|--------|--------|----------|
| `client-documents` | Autenticado | Upload: auth'd users. Download/Delete: mesma logica RLS de client_documents |
| `import-uploads` | Autenticado | Upload: auth'd. Download: creator OR owner. Delete: creator OR owner |

---

## 4. API Design (Hono)

### 4.1 Convencoes Gerais

- **Base path:** `/api/v1`
- **Auth:** Header `Authorization: Bearer <supabase-jwt>` em todas as rotas (exceto health)
- **Content-Type:** `application/json` (exceto uploads: `multipart/form-data`)
- **Response format:**
  ```typescript
  // Sucesso
  { data: T, meta?: { total: number, page: number, limit: number } }
  // Erro
  { error: { code: string, message: string, details?: unknown } }
  ```
- **Pagination:** `?page=1&limit=20` (default limit=20, max=100)
- **Validation:** Todos os inputs validados com Zod no middleware. 400 se invalido.
- **IDs:** UUID v4 em todos os recursos

### 4.2 Middleware Stack

```
request
  → CORS (origins: web app domain)
  → Request ID (x-request-id header)
  → Logger (method, path, status, duration)
  → Error Handler (catch-all, structured error response)
  → Auth Middleware (JWT validation, user context injection)
  → Rate Limiter (per-user, configurable per-route)
  → Zod Validator (per-route, input schema)
  → Route Handler
```

### 4.3 Rotas por Modulo

#### Health
```
GET  /health                              # { status: "ok", version: "x.y.z" }
```

#### Auth
```
POST /api/v1/auth/register                # { email, password, full_name }
POST /api/v1/auth/login                   # { email, password } → { session, user }
POST /api/v1/auth/logout                  # Invalida sessao
POST /api/v1/auth/refresh                 # Refresh token
GET  /api/v1/auth/me                      # Profile do usuario logado
```

#### Clients
```
GET    /api/v1/clients                    # Lista (filtros: status, search)
POST   /api/v1/clients                    # Criar cliente
GET    /api/v1/clients/:id                # Detalhe
PUT    /api/v1/clients/:id                # Atualizar
DELETE /api/v1/clients/:id                # Deletar (owner only)
```

#### Client Documents
```
GET    /api/v1/clients/:id/documents      # Listar documentos
POST   /api/v1/clients/:id/documents      # Upload (multipart)
DELETE /api/v1/clients/:id/documents/:docId # Deletar documento
GET    /api/v1/clients/:id/documents/:docId/download # Download URL
```

#### Campaigns
```
GET    /api/v1/clients/:id/campaigns                  # Listar campanhas (filtros: platform, status, period)
GET    /api/v1/clients/:id/campaigns/:campaignId       # Detalhe com metricas
POST   /api/v1/clients/:id/campaigns/refresh           # Forcar refresh do cache (rate limited)
GET    /api/v1/campaigns/aggregate                     # Metricas agregadas (todos os clientes, para dashboard geral)
```

#### Ad Platform Tokens
```
POST   /api/v1/clients/:id/tokens                     # Salvar token (meta: access_token; google: OAuth callback)
DELETE /api/v1/clients/:id/tokens/:platform            # Remover integracao
GET    /api/v1/clients/:id/tokens/status               # Status de cada plataforma (connected/expired/none)
```

#### Google Ads OAuth
```
GET    /api/v1/auth/google-ads/authorize               # Redirect para OAuth Google
GET    /api/v1/auth/google-ads/callback                # Callback OAuth → salva tokens
```

#### Alert Rules
```
GET    /api/v1/clients/:id/alert-rules                 # Listar regras
POST   /api/v1/clients/:id/alert-rules                 # Criar regra
PUT    /api/v1/clients/:id/alert-rules/:ruleId         # Atualizar
DELETE /api/v1/clients/:id/alert-rules/:ruleId         # Deletar
```

#### Alerts
```
GET    /api/v1/alerts                                  # Listar alertas (filtros: client_id, acknowledged)
POST   /api/v1/alerts/:id/acknowledge                  # Marcar como acknowledged
GET    /api/v1/alerts/count                            # Contagem de alertas nao acknowledged (para badge)
```

#### Tasks
```
GET    /api/v1/tasks                                   # Listar (filtros: client_id, assigned_to, status, priority)
POST   /api/v1/tasks                                   # Criar
GET    /api/v1/tasks/:id                               # Detalhe
PUT    /api/v1/tasks/:id                               # Atualizar (inclui mudanca de status via drag-drop)
DELETE /api/v1/tasks/:id                               # Deletar
```

#### Task Comments
```
GET    /api/v1/tasks/:id/comments                      # Listar comentarios
POST   /api/v1/tasks/:id/comments                      # Adicionar comentario
```

#### Automations (n8n Proxy)
```
GET    /api/v1/automations/workflows                   # Listar workflows n8n
POST   /api/v1/automations/workflows/:id/activate      # Ativar workflow
POST   /api/v1/automations/workflows/:id/deactivate    # Desativar workflow
POST   /api/v1/automations/workflows/:id/execute       # Executar manualmente
GET    /api/v1/automations/workflows/:id/executions     # Log de execucoes
```

#### Automation Triggers
```
GET    /api/v1/automations/triggers                    # Listar triggers
POST   /api/v1/automations/triggers                    # Criar trigger
PUT    /api/v1/automations/triggers/:id                # Atualizar
DELETE /api/v1/automations/triggers/:id                # Deletar
GET    /api/v1/automations/triggers/:id/logs           # Historico de execucoes
```

#### API Connectors
```
GET    /api/v1/api-connectors                          # Listar
POST   /api/v1/api-connectors                          # Registrar
PUT    /api/v1/api-connectors/:id                      # Atualizar
DELETE /api/v1/api-connectors/:id                      # Deletar
POST   /api/v1/api-connectors/:id/test                 # Testar conexao
```

#### Data Import
```
POST   /api/v1/import/csv                              # Upload CSV (multipart)
POST   /api/v1/import/google-sheets                    # Importar de Google Sheets
POST   /api/v1/import/:id/preview                      # Preview mapeamento (primeiras 5 linhas)
POST   /api/v1/import/:id/execute                      # Executar importacao
GET    /api/v1/import/history                           # Historico de importacoes
```

#### Agent
```
POST   /api/v1/agent/chat                              # Nova mensagem → SSE stream
GET    /api/v1/agent/sessions                          # Listar sessoes do usuario
GET    /api/v1/agent/sessions/:id                      # Historico de uma sessao
DELETE /api/v1/agent/sessions/:id                      # Deletar sessao
GET    /api/v1/agent/audit-logs                        # Listar logs (owner only)
```

### 4.4 Endpoint do Agente -- Detalhe

```
POST /api/v1/agent/chat
Content-Type: application/json
Authorization: Bearer <jwt>

Request Body:
{
  "message": "Como esta o cliente X?",
  "session_id": "uuid" | null  // null = nova sessao
}

Response: SSE stream (text/event-stream)

Events:
  data: {"type": "text_delta", "content": "O cliente"}
  data: {"type": "text_delta", "content": " X esta..."}
  data: {"type": "tool_use_start", "tool": "get_client", "input": {"name": "X"}}
  data: {"type": "tool_use_result", "tool": "get_client", "result": {...}}
  data: {"type": "confirmation_required", "tool": "delete_client", "input": {...}}
  data: {"type": "done", "session_id": "uuid", "usage": {"input_tokens": 1500, "output_tokens": 300}}
```

---

## 5. Agent Harness -- Arquitetura Detalhada

### 5.1 Loop Conversacional (Pseudocodigo)

```typescript
async function conversationLoop(
  message: string,
  sessionId: string | null,
  ctx: RequestContext
): AsyncGenerator<SSEEvent> {
  // 1. Load or create session
  const session = sessionId
    ? await sessionStore.get(sessionId)
    : await sessionStore.create(ctx.userId)

  // 2. Add user message to history
  session.messages.push({ role: 'user', content: message, timestamp: Date.now() })

  // 3. Check context window size
  if (estimateTokens(session.messages) > 80_000) {
    session.messages = await compaction.compact(session.messages)
  }

  // 4. Build system prompt
  const systemPrompt = await contextBuilder.build({
    user: ctx.user,
    tools: toolRegistry.getEnabled(ctx.user.role),
    workspace: await workspaceContext.get(),
    memory: await memoryService.getRelevant(message, ctx.userId)
  })

  // 5. Prepare Claude API request
  const tools = toolRegistry.getSchemas(ctx.user.role)
  let continueLoop = true

  while (continueLoop) {
    // 6. Call Claude API with streaming
    const stream = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: session.messages,
      tools: tools,
      stream: true
    })

    let assistantContent: ContentBlock[] = []

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'text_delta', content: event.delta.text }
        }
        // Accumulate content blocks
      }
    }

    // 7. Check if response contains tool_use
    const toolUseBlocks = assistantContent.filter(b => b.type === 'tool_use')

    if (toolUseBlocks.length === 0) {
      continueLoop = false
      break
    }

    // 8. Execute tools
    const toolResults: ToolResultBlock[] = []

    for (const toolUse of toolUseBlocks) {
      // Pre-hook: permission + rate limit + destructive guard
      const preCheck = await preToolHook.check(toolUse, ctx)

      if (preCheck.needsConfirmation) {
        yield { type: 'confirmation_required', tool: toolUse.name, input: toolUse.input }
        // Wait for user confirmation (handled by next message in session)
        return
      }

      if (preCheck.denied) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Permission denied: ${preCheck.reason}`
        })
        continue
      }

      // Execute tool
      const startTime = Date.now()
      const result = await toolRegistry.execute(toolUse.name, toolUse.input, ctx.toolContext)
      const duration = Date.now() - startTime

      // Post-hook: audit log
      await postToolHook.log({
        sessionId: session.id,
        toolName: toolUse.name,
        input: toolUse.input,
        output: result,
        durationMs: duration,
        userId: ctx.userId
      })

      yield { type: 'tool_use_result', tool: toolUse.name, result }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result)
      })
    }

    // 9. Add assistant + tool results to messages
    session.messages.push({ role: 'assistant', content: assistantContent })
    session.messages.push({ role: 'user', content: toolResults })

    // Loop continues — Claude will process tool results
  }

  // 10. Persist session
  session.tokenCount = estimateTokens(session.messages)
  await sessionStore.update(session)

  yield { type: 'done', sessionId: session.id, usage: { ... } }
}
```

### 5.2 Tool Registry

```typescript
class ToolRegistry {
  private tools: Map<string, UhuruTool> = new Map()

  register(tool: UhuruTool): void {
    this.tools.set(tool.name, tool)
  }

  // Retorna tools habilitadas para o role do usuario
  getEnabled(userRole: string): UhuruTool[] {
    return Array.from(this.tools.values()).filter(tool => {
      // Check role requirement
      const roleHierarchy = ['member', 'owner']
      const userLevel = roleHierarchy.indexOf(userRole)
      const requiredLevel = roleHierarchy.indexOf(tool.permissions.requiredRole)
      return userLevel >= requiredLevel
    })
  }

  // Retorna schemas para a Claude API
  getSchemas(userRole: string): ClaudeTool[] {
    return this.getEnabled(userRole).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: zodToJsonSchema(tool.inputSchema)
    }))
  }

  async execute(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) throw new ToolNotFoundError(name)
    const validatedInput = tool.inputSchema.parse(input)
    return tool.call(validatedInput, ctx)
  }
}
```

### 5.3 UhuruTool Interface

```typescript
interface UhuruTool {
  name: string                                   // Unique identifier
  description: string                            // Para o Claude entender quando usar
  inputSchema: ZodSchema                         // Validation + JSON schema generation
  permissions: {
    requiredRole: 'member' | 'owner'             // Minimum role
    isReadOnly: boolean                          // true = safe, no side effects
    isDestructive: boolean                       // true = requires confirmation
  }
  isEnabled(ctx: ToolContext): boolean            // Dynamic enable/disable
  call(input: unknown, ctx: ToolContext): Promise<ToolResult>
  prompt(): string                               // System prompt contribution
}

interface ToolContext {
  sessionId: string
  userId: string
  userRole: string
  supabase: SupabaseClient                       // Authenticated with user JWT
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}
```

### 5.4 Built-in Tools

| Tool Name | Module | Role | Read-Only | Destructive |
|-----------|--------|------|-----------|-------------|
| list_clients | Clients | member | true | false |
| get_client | Clients | member | true | false |
| create_client | Clients | member | false | false |
| update_client | Clients | member | false | false |
| delete_client | Clients | owner | false | true |
| list_campaigns | Campaigns | member | true | false |
| get_campaign_metrics | Campaigns | member | true | false |
| refresh_metrics | Campaigns | owner | false | false |
| list_tasks | Tasks | member | true | false |
| get_task | Tasks | member | true | false |
| create_task | Tasks | member | false | false |
| update_task | Tasks | member | false | false |
| delete_task | Tasks | owner | false | true |
| add_task_comment | Tasks | member | false | false |
| list_workflows | Automations | member | true | false |
| execute_workflow | Automations | owner | false | true |
| toggle_workflow | Automations | owner | false | false |
| list_triggers | Automations | member | true | false |
| create_trigger | Automations | owner | false | false |
| list_alerts | Alerts | member | true | false |
| acknowledge_alert | Alerts | member | false | false |
| call_api_connector | API Connector | member | false | false |
| import_data | Import | member | false | false |
| search_memory | Memory | member | true | false |

### 5.5 Permission Model

```typescript
// Pre-tool hook logic
async function checkPermission(toolUse: ToolUseBlock, ctx: RequestContext): Promise<PreCheckResult> {
  const tool = registry.get(toolUse.name)

  // 1. Role check
  if (!hasRequiredRole(ctx.user.role, tool.permissions.requiredRole)) {
    return { denied: true, reason: `Requires ${tool.permissions.requiredRole} role` }
  }

  // 2. Rate limit check
  const count = await rateLimiter.getCount(ctx.userId, '1m')
  if (count >= 30) {
    return { denied: true, reason: 'Rate limit exceeded (30 msg/min)' }
  }

  // 3. Destructive check
  if (tool.permissions.isDestructive) {
    return { needsConfirmation: true }
  }

  return { allowed: true }
}
```

### 5.6 Memory System

```
                    +------------------+
                    | User sends msg   |
                    +--------+---------+
                             |
                    +--------v---------+
                    | memory.ts        |
                    | getRelevant()    |
                    +--+----------+----+
                       |          |
              +--------v---+  +--v-----------+
              | Mem0 API   |  | Qdrant API   |
              | (VPS)      |  | (VPS)        |
              | Short-term |  | Vector search|
              | facts +    |  | over docs +  |
              | preferences|  | past convos  |
              +------+-----+  +------+-------+
                     |               |
                     +-------+-------+
                             |
                    +--------v---------+
                    | Merged context   |
                    | injected in      |
                    | system prompt    |
                    +------------------+
```

- **Mem0 (VPS 72.60.9.248):** Armazena facts e preferencias do usuario/workspace. API REST.
- **Qdrant (VPS 72.60.9.248):** Busca semantica sobre historico de conversas e documentos. API REST.
- **Supabase `agent_sessions`:** Historico completo de mensagens (source of truth).

**Fluxo de memoria:**
1. Ao receber mensagem, `memory.ts` busca em paralelo: Mem0 (facts relevantes) + Qdrant (conversas similares)
2. Resultados injetados no system prompt como contexto
3. Apos resposta, post-hook salva fatos novos no Mem0 e embeddings no Qdrant (async, nao bloqueia resposta)

### 5.7 Session Management e Compaction

- Sessoes persistidas em `agent_sessions` (Supabase) com array de mensagens em jsonb
- Cada mensagem tem: `role`, `content`, `timestamp`
- **Compaction:** Quando `token_count > 80_000`:
  1. Manter system prompt intacto
  2. Manter ultimas 10 mensagens intactas
  3. Summarizar mensagens antigas com Claude (prompt de compaction)
  4. Substituir mensagens antigas pelo summary
- **Session title:** Auto-gerado pela primeira mensagem do usuario (Claude gera titulo curto)

### 5.8 Audit Trail

Toda execucao de tool grava em `agent_audit_logs`:
```json
{
  "session_id": "uuid",
  "tool_name": "create_task",
  "input": { "title": "Revisar campanha X", "client_id": "uuid" },
  "output": { "success": true, "data": { "id": "uuid", "title": "..." } },
  "duration_ms": 45,
  "user_id": "uuid",
  "created_at": "2026-04-08T10:30:00Z"
}
```

Retencao: 90 dias (NFR7). Cleanup via pg_cron `DELETE FROM agent_audit_logs WHERE created_at < now() - interval '90 days'`.

---

## 6. Integracoes Externas

### 6.1 Meta Marketing API

**Auth:**
- Token de longa duracao (60 dias) inserido manualmente pelo usuario na UI
- Armazenado em `ad_platform_tokens` (encrypted)
- Renovacao: alerta automatico 7 dias antes de expirar + botao de renovar na UI
- Credenciais do app Meta: `op://Development/Meta-App/app-id` e `op://Development/Meta-App/app-secret`

**Endpoints utilizados:**
```
GET /{ad-account-id}/campaigns
    ?fields=id,name,status,objective,daily_budget,lifetime_budget
    &filtering=[{field:"effective_status",operator:"IN",value:["ACTIVE","PAUSED"]}]

GET /{ad-account-id}/insights
    ?fields=spend,impressions,clicks,ctr,cpc,actions,action_values
    &time_range={since,until}
    &level=campaign
    &filtering=[{field:"campaign.id",operator:"IN",value:[...]}]
```

**Rate Limits Meta:**
- Business Use Case Rate Limit: depende do app tier
- Standard: 200 calls / user / hour
- Estrategia: cache de 30 minutos, batch requests, exponential backoff

**Estrategia de Cache:**
1. Refresh a cada 30 minutos via background job (setInterval ou Supabase pg_cron + Edge Function)
2. Dados salvos em `campaign_metrics_cache` com `fetched_at`
3. Frontend consome apenas do cache (nunca chama Meta API diretamente)
4. Botao "Refresh Now" disponivel para owner (rate limited: max 1x a cada 5 min por cliente)

### 6.2 Google Ads API

**Auth:**
- OAuth 2.0 flow completo
- MCC (Manager Account): `4043314752`
- OAuth client: `op://Development/Google-Ads-OAuth/client-id` e `op://Development/Google-Ads-OAuth/client-secret`
- Developer token: `op://Development/Google-Ads-OAuth/developer-token`
- Refresh token armazenado em `ad_platform_tokens` (encrypted)
- Access token refreshed automaticamente quando expira

**OAuth Flow:**
```
1. Usuario clica "Conectar Google Ads" no cliente
2. Redirect para Google OAuth consent screen
3. Usuario autoriza → callback com code
4. Backend troca code por access_token + refresh_token
5. Tokens salvos em ad_platform_tokens
6. Access token refreshed automaticamente via refresh_token
```

**Endpoints utilizados (Google Ads API v17+):**
```
POST /v17/customers/{customer-id}/googleAds:searchStream
  query: "SELECT campaign.id, campaign.name, campaign.status, 
          metrics.cost_micros, metrics.impressions, metrics.clicks, 
          metrics.ctr, metrics.average_cpc, metrics.conversions,
          metrics.conversions_value
          FROM campaign 
          WHERE segments.date DURING LAST_30_DAYS"
```

**Rate Limits Google Ads:**
- 15,000 operations / day / developer token (Standard Access)
- Estrategia identica ao Meta: cache de 30 min, batch via GAQL

### 6.3 n8n API (VPS 72.60.9.248)

**Auth:**
- API key armazenada em Supabase Vault
- `op://Development/n8n-VPS/api-key`
- Base URL: `http://72.60.9.248:5678/api/v1` (interno, nao exposto publicamente)

**Endpoints utilizados:**
```
GET    /workflows                         # Listar todos os workflows
GET    /workflows/:id                     # Detalhe do workflow
POST   /workflows/:id/activate           # Ativar
POST   /workflows/:id/deactivate         # Desativar
POST   /workflows/:id/execute            # Executar manualmente
GET    /executions?workflowId=:id         # Log de execucoes
```

**Seguranca:**
- n8n roda na VPS com acesso restrito por IP
- API do Hono (apps/api) faz proxy — frontend nunca acessa n8n diretamente
- Timeout de 30s para execucoes de workflow

### 6.4 Supabase Realtime

**Canais:**

| Canal | Evento | Uso |
|-------|--------|-----|
| `campaign_metrics_cache` | INSERT, UPDATE | Dashboard atualiza metricas sem refresh |
| `alerts` | INSERT | Badge de alertas no topbar atualiza |
| `tasks` | INSERT, UPDATE, DELETE | Kanban atualiza quando outro usuario modifica |

**Implementacao:**
```typescript
// Frontend
const channel = supabase
  .channel('metrics-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'campaign_metrics_cache',
    filter: `client_id=eq.${clientId}`
  }, (payload) => {
    queryClient.invalidateQueries(['campaigns', clientId])
  })
  .subscribe()
```

### 6.5 Mem0 API (VPS 72.60.9.248)

**Base URL:** `http://72.60.9.248:8080` (porta do Mem0 na VPS)

**Endpoints utilizados:**
```
POST /v1/memories/              # Adicionar memoria
GET  /v1/memories/search/       # Buscar memorias relevantes
GET  /v1/memories/              # Listar memorias do usuario
DELETE /v1/memories/:id         # Deletar memoria
```

**Uso no agente:**
- `user_id` do Mem0 = `profiles.id` do Supabase (mapeamento 1:1)
- Memorias sao criadas automaticamente pelo post-tool hook quando o agente aprende algo novo
- Busca de memorias relevantes feita no pre-prompt build (top 5 por similaridade)

### 6.6 Qdrant (VPS 72.60.9.248)

**Base URL:** `http://72.60.9.248:6333`

**Collections:**
- `uhuru_conversations` — embeddings de mensagens de conversas
- `uhuru_documents` — embeddings de documentos de clientes (opcional, P1)

**Uso:**
- Embeddings gerados via Claude embeddings API ou modelo local
- Busca semantica para contexto de conversas anteriores relevantes
- Armazenamento async apos cada conversa (nao bloqueia fluxo)

---

## 7. Seguranca

### 7.1 Autenticacao

```
1. Usuario faz login via Supabase Auth (email/password)
2. Supabase retorna JWT com claims: { sub: user_id, role: ... }
3. Frontend armazena JWT em memoria (nao localStorage para seguranca)
4. Toda request ao Hono inclui JWT no header Authorization
5. Middleware Hono valida JWT via Supabase.auth.getUser(token)
6. User context injetado em c.set('user', { id, role, ... })
```

**Refresh:** Supabase SDK lida com refresh automatico do JWT no frontend via `onAuthStateChange`.

### 7.2 RLS (Row Level Security)

Ver secao 3.3 para policies detalhadas por tabela.

**Principio central:** O agente usa o Supabase client autenticado com o JWT do usuario. Todas as queries do agente passam por RLS — o agente VE e MODIFICA apenas o que o usuario tem permissao.

**O que NUNCA acontece:**
- Agente usando `service_role` key do Supabase
- Agente acessando banco sem RLS
- Query sem `auth.uid()` no WHERE (RLS garante isso)

**Funcoes SECURITY DEFINER:** Usadas apenas para operacoes de sistema (popular cache de metricas, criar alerts). Estas funcoes tem seu proprio escopo de permissoes e nao sao expostas como tools do agente.

### 7.3 Validacao de Inputs

- **Todos** os inputs de API validados com Zod schemas
- Schemas compartilhados entre frontend e backend via `packages/shared`
- Middleware `validate.ts` rejeita requests com input invalido antes de chegar ao handler
- Schemas Zod tambem usados para validar inputs de tools do agente

### 7.4 OWASP Top 10 Considerations

| # | Vulnerabilidade | Mitigacao |
|---|----------------|-----------|
| A01 | Broken Access Control | RLS em todas as tabelas, role check em tools, JWT validation |
| A02 | Cryptographic Failures | Tokens de ads encrypted (Supabase Vault/pgcrypto), HTTPS obrigatorio |
| A03 | Injection | Supabase SDK (parameterized queries), Zod validation, sem raw SQL |
| A04 | Insecure Design | Agente nunca usa service_role, tools destrutivas requerem confirmacao |
| A05 | Security Misconfiguration | RLS habilitado por default, CORS restrito, env vars validadas |
| A06 | Vulnerable Components | Dependabot no GitHub, lockfile audits periodicos |
| A07 | Auth Failures | Supabase Auth (battle-tested), rate limiting no login |
| A08 | Data Integrity Failures | Zod validation em todos os inputs, constraint checks no DB |
| A09 | Security Logging | agent_audit_logs com 90 dias de retencao, request logging |
| A10 | SSRF | API Connector: validacao de URLs (blocklist de IPs internos), timeout rigoroso |

### 7.5 Permissoes do Agente

O agente e um **cidadao com os mesmos direitos do usuario logado**, nunca mais:

1. JWT do usuario propagado ao `ToolContext`
2. Supabase client no `ToolContext` autenticado com esse JWT
3. Tools chamam service layer que usa esse client → RLS aplicado
4. Tools destrutivas (`isDestructive: true`) retornam `needs_confirmation` → usuario confirma na UI
5. Rate limiting: 30 msg/min por usuario (independente se via UI ou agente)

### 7.6 Seguranca do API Connector

O modulo de API Connector permite registrar APIs externas. Riscos adicionais:

- **SSRF:** Validar URLs registradas — bloquear IPs privados (10.x, 172.16.x, 192.168.x, 127.x, ::1), metadata endpoints (169.254.169.254)
- **Credential storage:** `auth_config` armazenado como jsonb encrypted
- **Timeout:** Requests a APIs externas com timeout de 10s
- **Response size:** Limitar resposta a 1MB
- **Owner only:** Apenas owner pode registrar APIs (member pode usar via agente se ativa)

---

## 8. Infraestrutura e Deploy

### 8.1 Ambiente de Desenvolvimento (Local)

```yaml
# docker-compose.yml (opcional — para Supabase local)
services:
  # Supabase local via `supabase start` (CLI) — preferido
  # OU Supabase Cloud direto (dev project separado)
```

**Dev workflow:**
```bash
# Terminal 1: Frontend
cd apps/web && bun dev        # Vite dev server, port 5173

# Terminal 2: Backend
cd apps/api && bun dev        # Hono dev server, port 3000

# Supabase
supabase start                # Local Supabase (Docker)
# OU usar Supabase Cloud dev project
```

### 8.2 Deploy de Producao

| Componente | Destino | Dominio |
|------------|---------|---------|
| apps/web | Vercel (static build) | uhuru-os.vercel.app (ou custom domain) |
| apps/api | VPS 72.60.9.248 (Bun runtime) | api.uhuru-os.com (ou subdomain) |
| Supabase | Supabase Cloud | (managed) |
| Mem0 | VPS 72.60.9.248 | (interno, port 8080) |
| Qdrant | VPS 72.60.9.248 | (interno, port 6333) |
| n8n | VPS 72.60.9.248 | (interno, port 5678) |

**Deploy do apps/api na VPS:**
```bash
# Opcao 1: PM2 (simples)
pm2 start bun -- run apps/api/src/index.ts --name uhuru-api

# Opcao 2: Docker container
# Dockerfile no apps/api, build e run via docker-compose
```

**CRITICO:** Nao tocar nos containers Docker existentes na VPS (n8n, Metabase, PostgreSQL). O apps/api roda como processo separado ou em container novo isolado.

### 8.3 Variaveis de Ambiente

```bash
# Supabase
SUPABASE_URL=                          # op://Development/Supabase-Uhuru/url
SUPABASE_ANON_KEY=                     # op://Development/Supabase-Uhuru/anon-key
SUPABASE_SERVICE_ROLE_KEY=             # op://Development/Supabase-Uhuru/service-role-key (APENAS para migrations, NUNCA no runtime do agente)

# Claude API
ANTHROPIC_API_KEY=                     # op://Development/Anthropic/api-key

# Meta Ads
META_APP_ID=                           # op://Development/Meta-App/app-id
META_APP_SECRET=                       # op://Development/Meta-App/app-secret

# Google Ads
GOOGLE_ADS_CLIENT_ID=                  # op://Development/Google-Ads-OAuth/client-id
GOOGLE_ADS_CLIENT_SECRET=              # op://Development/Google-Ads-OAuth/client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=           # op://Development/Google-Ads-OAuth/developer-token
GOOGLE_ADS_MCC_ID=4043314752

# n8n
N8N_API_URL=http://72.60.9.248:5678/api/v1
N8N_API_KEY=                           # op://Development/n8n-VPS/api-key

# Mem0
MEM0_API_URL=http://72.60.9.248:8080

# Qdrant
QDRANT_API_URL=http://72.60.9.248:6333

# App
APP_URL=https://uhuru-os.vercel.app
API_URL=https://api.uhuru-os.com
NODE_ENV=production
```

### 8.4 CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run test

  deploy-web:
    needs: quality
    if: github.ref == 'refs/heads/main'
    # Vercel auto-deploys from main

  deploy-api:
    needs: quality
    if: github.ref == 'refs/heads/main'
    # SSH to VPS, pull, rebuild, restart PM2/Docker
```

---

## 9. Decisoes e Trade-offs

### 9.1 Tabela de Decisoes

| Decisao | Escolha | Alternativas Consideradas | Rationale |
|---------|---------|---------------------------|-----------|
| Monorepo tool | Turborepo | Nx, pnpm workspaces, Lerna | Turborepo e mais simples, cache inteligente nativo, zero config overhead. Nx e overkill para 3-4 packages. |
| Runtime backend | Bun | Node.js, Deno | Performance nativa, TypeScript first-class, compat com Node ecosystem. Joao ja tem experiencia com Bun. |
| Framework HTTP | Hono | Express, Fastify, Elysia | Hono e leve, TypeScript-first, roda em qualquer runtime (Bun, Node, Edge). Elysia tem API mais complexa sem ganho claro. |
| Database | Supabase (Postgres) | Firebase, PlanetScale, Neon | Auth integrado, RLS nativo (critico para o agente), Realtime, Storage — tudo em um. Decisao travada. |
| AI model | Claude (tool-calling) | GPT-4, Gemini | Tool-calling nativo do Claude e o mais robusto. Joao ja opera no ecossistema Anthropic. Decisao travada. |
| Memoria do agente | Mem0 + Qdrant | Supabase pgvector, Pinecone | Mem0 + Qdrant ja provisionados na VPS. pgvector seria mais simples, mas Mem0 oferece abstracoes de memoria (facts, preferences) que pgvector nao tem. |
| Frontend framework | React 19 + Vite | Next.js, Remix | SPA sem necessidade de SSR. Vite para DX rapida. Next.js adicionaria complexidade desnecessaria (server components, file routing). Decisao travada. |
| Styling | Tailwind 4 + shadcn/ui | Chakra, MUI, Ant Design | shadcn/ui e copiavel (nao e npm dependency), customizavel, leve. MUI/Chakra sao pesados para uma tool interna. |
| Automacoes | n8n (existente) via API | Temporal, Bull, custom engine | n8n ja roda e tem workflows configurados. Zero provisioning. Apenas expor via API proxy. |
| Cache de metricas | Supabase table + TTL | Redis, in-memory | Supabase table permite RLS no cache, queries SQL flexiveis, Realtime. Redis seria mais rapido mas adiciona infra. Para 30min TTL, Postgres e suficiente. |
| Agente acessa DB como | Via service layer (Hono) | Acesso direto ao Supabase | Agente via service layer garante que toda logica de negocio e compartilhada com a UI. Acesso direto criaria dois paths para a mesma operacao. |
| Confirmacao de tools destrutivas | SSE event + UI prompt | Auto-confirm, webhook | UI prompt garante que o usuario humano esta no loop. Auto-confirm e perigoso. Webhook adicionaria latencia. |

### 9.2 Riscos Tecnicos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Claude API downtime | Baixa | Alto | Graceful degradation: UI funciona sem agente. Toast "Agente indisponivel". |
| Context window overflow | Media | Medio | Compaction automatica em >80k tokens. Summarization de historico antigo. |
| Token de Meta expira sem aviso | Media | Medio | Job de verificacao diaria de validade. Alerta 7 dias antes. Badge na UI. |
| Rate limits de ads APIs | Alta | Medio | Cache de 30min. Nunca on-demand do usuario. Batch requests. |
| VPS fica indisponivel | Baixa | Alto | Monitoramento basico (uptime check). n8n, Mem0, Qdrant degradam gracefully — agente perde memoria mas continua operando. |
| Performance do Hono na VPS | Baixa | Medio | Bun e eficiente. Para MVP com <10 usuarios, VPS e mais que suficiente. PM2 para restart automatico. |
| Custo da Claude API | Media | Alto | Rate limiting por usuario (30 msg/min). Dashboard de custo. Alertas de budget. Modelo menor (Haiku) para operacoes simples como opcao futura. |

### 9.3 O Que NAO Fazer no MVP

- **Multi-tenancy:** Single-tenant. Nao adicionar `tenant_id` nem RLS por organizacao.
- **SSR/Next.js:** SPA e suficiente. Sem SEO requirements para tool interna.
- **Microservicos:** Monolito modular. Um deploy (apps/api) serve tudo.
- **Queue system:** Sem Redis, sem Bull. Jobs de cache rodam via setInterval no processo do Hono ou via Supabase cron.
- **Custom auth:** Supabase Auth e suficiente. Sem SSO/SAML no MVP.
- **Mobile app:** Web desktop-first. Mobile e P1.
- **Real-time de metricas:** Cache de 30min, nao streaming de metricas. Rate limits das APIs impedem real-time.

---

## 10. Handoffs

### 10.1 Para @data-engineer (Dara)

**Artefato:** DDL completo derivado da secao 3 deste design doc.

**Escopo:**
1. DDL SQL para todas as 14 tabelas especificadas na secao 3.2
2. Indices conforme especificado
3. Constraints (unique, check, FK) conforme especificado
4. Trigger `on_auth_user_created` para tabela `profiles`
5. RLS policies para todas as tabelas conforme secao 3.3
6. Funcao helper `get_user_role()` (SECURITY DEFINER)
7. Funcoes SECURITY DEFINER para insercao em `campaign_metrics_cache` e `alerts` (bypass RLS controlado)
8. Seed data para desenvolvimento (1 owner, 1 member, 3 clientes de exemplo)
9. Supabase Storage bucket policies para `client-documents` e `import-uploads`
10. pg_cron job para cleanup de `agent_audit_logs` com mais de 90 dias

**Formato:** Migrations SQL ordenadas em `supabase/migrations/`

**Referencia:** `D:/workspace/projects/uhuru-os/docs/architecture/DESIGN-DOC.md` secoes 3.2, 3.3, 3.4

### 10.2 Para @sm (River)

**Artefato:** Stories tecnicas derivadas deste design doc.

**Epic sugerido:** Epic 1 (Foundation) deve gerar as seguintes stories:

1. **Story 1.1:** Monorepo scaffold (Turborepo + Bun + apps + packages) — secao 2
2. **Story 1.2:** Supabase setup (schema + Auth + RLS) — secoes 3, 7.1, 7.2
3. **Story 1.3:** Auth flow (login, register, protected routes) — secoes 4.3 (Auth routes), 7.1

Epics 2-8 ja tem stories detalhadas no PRD. Este design doc serve como referencia tecnica para implementacao.

**Referencia:** PRD em `D:/workspace/projects/uhuru-os/docs/prd.md` + este design doc

---

*Aria, arquitetando o futuro*
