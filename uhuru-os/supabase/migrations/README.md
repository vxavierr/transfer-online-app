# Uhuru OS — Database Migrations

## Ordem de Execução

Execute as migrations em ordem numérica estrita. Cada arquivo depende dos anteriores.

```
20260408000001_create_profiles.sql
20260408000002_create_clients.sql
20260408000003_create_client_documents.sql
20260408000004_create_ad_platform_tokens.sql
20260408000005_create_campaign_metrics_cache.sql
20260408000006_create_alert_rules.sql
20260408000007_create_alerts.sql
20260408000008_create_tasks.sql
20260408000009_create_task_comments.sql
20260408000010_create_automation_triggers.sql
20260408000011_create_automation_trigger_logs.sql
20260408000012_create_api_connectors.sql
20260408000013_create_import_jobs.sql
20260408000014_create_agent_sessions.sql
20260408000015_create_agent_audit_logs.sql
20260408000016_rls_policies.sql
20260408000017_functions_and_triggers.sql
20260408000018_seed_data.sql          ← DEV ONLY
```

## Grafo de Dependências

```
auth.users (Supabase built-in)
    └── 001_profiles
            ├── 002_clients
            │       ├── 003_client_documents
            │       ├── 004_ad_platform_tokens
            │       ├── 005_campaign_metrics_cache
            │       ├── 006_alert_rules
            │       │       └── 007_alerts
            │       ├── 008_tasks
            │       │       └── 009_task_comments
            │       └── 010_automation_triggers
            │               └── 011_automation_trigger_logs
            ├── 012_api_connectors
            ├── 013_import_jobs
            └── 014_agent_sessions
                    └── 015_agent_audit_logs

016_rls_policies          (depends on 001–015, references all tables)
017_functions_and_triggers (depends on 001–016, adds utility functions + Realtime)
018_seed_data             (depends on 001–017, DEV ONLY)
```

## Executar via Supabase CLI

```bash
# Aplicar todas as migrations (exceto seed)
supabase db push

# Reset completo em DEV (migrations + seed)
supabase db reset

# Aplicar migration específica
supabase migration up --target 20260408000016
```

## Tabelas por Módulo

| Módulo | Tabelas |
|--------|---------|
| Auth / Perfis | `profiles` |
| Clientes | `clients`, `client_documents`, `ad_platform_tokens` |
| Campanhas | `campaign_metrics_cache` |
| Alertas | `alert_rules`, `alerts` |
| Tarefas | `tasks`, `task_comments` |
| Automações | `automation_triggers`, `automation_trigger_logs` |
| Integrações | `api_connectors`, `import_jobs` |
| Agente AI | `agent_sessions`, `agent_audit_logs` |

## Funções SECURITY DEFINER

Estas funções bypassam RLS e são chamadas exclusivamente pelo service layer:

| Função | Propósito |
|--------|-----------|
| `set_updated_at()` | Trigger para updated_at automático |
| `handle_new_user()` | Cria profile no signup |
| `get_user_role()` | Helper para policies RLS |
| `upsert_campaign_metrics(...)` | Upsert de métricas pelo background job |
| `insert_alert(...)` | Insere alert durante refresh de métricas |
| `insert_agent_audit_log(...)` | Insere log de tool invocation (post-hook) |
| `cleanup_old_audit_logs()` | Remove logs > 90 dias (agendado via pg_cron) |
| `check_and_trigger_automations(...)` | Avalia triggers após refresh de métricas |
| `evaluate_alert_rules(...)` | Avalia regras de alerta após refresh |
| `get_unacknowledged_alert_count()` | Contagem de alertas para o badge da UI |

## Extensões Necessárias

Habilitar no Supabase Dashboard (Settings > Database > Extensions):

| Extensão | Obrigatório | Uso |
|----------|------------|-----|
| `pgcrypto` | Sim | `gen_random_uuid()`, `crypt()` no seed |
| `pg_net` | Recomendado | HTTP calls para n8n (futuro) |
| `pg_cron` | Recomendado | Agendamento limpeza audit logs |

## Realtime

Tabelas com Realtime habilitado (via `supabase_realtime` publication):
- `tasks` — atualizações de Kanban em tempo real
- `alerts` — notificações de alertas
- `task_comments` — comentários ao vivo
- `agent_sessions` — streaming de mensagens do agente

## Notas de Segurança

- `ad_platform_tokens`: tokens devem ser criptografados pela aplicação antes de inserir
- `api_connectors.auth_config`: credenciais criptografadas pela aplicação
- `agent_audit_logs`: campos sensíveis (tokens, passwords) devem ser redacted pelo agent-harness antes de logar
- `campaign_metrics_cache` e `alerts`: usuários NÃO têm policy de INSERT/UPDATE direto — apenas via funções SECURITY DEFINER

## Seed de Desenvolvimento

O arquivo `20260408000018_seed_data.sql` cria:
- 2 usuários: `owner@uhuru.dev` e `member@uhuru.dev` (senha: `dev_password_123`)
- 3 clientes de teste
- 3 tarefas
- 2 regras de alerta
- Métricas de campanha para os últimos 2 dias

Executar apenas com `supabase db reset` — nunca em produção.
