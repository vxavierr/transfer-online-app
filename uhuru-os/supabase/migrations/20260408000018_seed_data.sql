-- Migration: 20260408000018_seed_data
-- Description: Development seed data for local Supabase instance
-- Depends on: 20260408000001 through 20260408000017
-- WARNING: Do NOT run in production. This file creates test users and data.
-- Usage: supabase db reset (applies all migrations + seed)

-- ============================================================
-- GUARD: skip if already seeded or if running in production
-- ============================================================
DO $$
BEGIN
  IF current_database() NOT IN ('postgres') THEN
    RAISE EXCEPTION 'Seed data must only run on local development database';
  END IF;
END
$$;

-- ============================================================
-- TEST USERS
-- Supabase local: use supabase.auth.admin.createUser() via CLI or dashboard
-- These UUIDs are fixed for reproducibility across resets
-- ============================================================

-- Insert directly into auth.users for local dev (Supabase local only)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, aud, role
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'owner@uhuru.dev',
    crypt('dev_password_123', gen_salt('bf')),
    now(),
    '{"full_name": "Uhuru Owner"}',
    now(), now(), 'authenticated', 'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'member@uhuru.dev',
    crypt('dev_password_123', gen_salt('bf')),
    now(),
    '{"full_name": "Uhuru Member"}',
    now(), now(), 'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Profiles are created by trigger on_auth_user_created.
-- Override role for the owner:
UPDATE public.profiles
SET role = 'owner'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- SEED: Clients
-- ============================================================
INSERT INTO public.clients (id, name, cnpj, contact_email, status, meta_account_id, created_by)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Clínica Exemplo LTDA',
    '12.345.678/0001-90',
    'contato@clinicaexemplo.com.br',
    'active',
    'act_123456789',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Tech Startup SA',
    NULL,
    'ops@techstartup.io',
    'active',
    NULL,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Loja Pausada',
    NULL,
    NULL,
    'paused',
    NULL,
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Tasks
-- ============================================================
INSERT INTO public.tasks (id, title, description, client_id, assigned_to, status, priority, created_by)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'Criar relatório semanal',
    'Relatório de performance das campanhas da semana',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'in_progress',
    'high',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Revisar budget de campanha Meta',
    NULL,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'backlog',
    'medium',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Onboarding Tech Startup',
    'Conectar Meta Ads e configurar primeiros alertas',
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'backlog',
    'urgent',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Alert Rules
-- ============================================================
INSERT INTO public.alert_rules (id, client_id, metric, operator, threshold, is_active, created_by)
VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'roas',
    'below',
    1.5,
    true,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'spend',
    'above',
    5000.00,
    true,
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Campaign Metrics Cache (sample data)
-- ============================================================
SELECT public.upsert_campaign_metrics(
  '10000000-0000-0000-0000-000000000001',
  'meta',
  '120214111111111',
  'Campanha Clínica - Conversão',
  'active',
  CURRENT_DATE - 1,
  1250.00, 45000, 850, 0.0189, 1.47, 12, 2400.00, 1.92
);

SELECT public.upsert_campaign_metrics(
  '10000000-0000-0000-0000-000000000001',
  'meta',
  '120214111111111',
  'Campanha Clínica - Conversão',
  'active',
  CURRENT_DATE - 2,
  980.00, 38000, 720, 0.0189, 1.36, 8, 1100.00, 1.12
);

SELECT public.upsert_campaign_metrics(
  '10000000-0000-0000-0000-000000000001',
  'meta',
  '120214222222222',
  'Campanha Clínica - Awareness',
  'active',
  CURRENT_DATE - 1,
  500.00, 120000, 600, 0.0050, 0.83, 0, 0.00, 0.00
);
