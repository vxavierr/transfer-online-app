-- Migration: 20260408000002_create_clients
-- Description: Agency clients with ad platform account references
-- Depends on: 20260408000001_create_profiles

CREATE TABLE IF NOT EXISTS public.clients (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  name              text        NOT NULL,
  cnpj              text,
  contact_email     text,
  contact_phone     text,
  status            text        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'ended')),
  meta_account_id   text,
  google_account_id text,
  created_by        uuid        NOT NULL REFERENCES public.profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.clients IS 'Agency clients. Each client can have Meta and/or Google Ads accounts linked.';
COMMENT ON COLUMN public.clients.cnpj IS 'Brazilian tax ID, format: XX.XXX.XXX/XXXX-XX';
COMMENT ON COLUMN public.clients.meta_account_id IS 'Meta Ads account ID (act_XXXXXXXXX)';
COMMENT ON COLUMN public.clients.google_account_id IS 'Google Ads CID (Customer ID)';

-- Indexes
CREATE INDEX idx_clients_status     ON public.clients (status);
CREATE INDEX idx_clients_created_by ON public.clients (created_by);

-- Auto-update updated_at
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
