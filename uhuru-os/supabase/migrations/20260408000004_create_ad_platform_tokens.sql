-- Migration: 20260408000004_create_ad_platform_tokens
-- Description: OAuth tokens for Meta and Google Ads per client
-- Depends on: 20260408000002_create_clients
-- Security: tokens stored encrypted; access restricted to owner role via RLS

CREATE TABLE IF NOT EXISTS public.ad_platform_tokens (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  client_id     uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform      text        NOT NULL CHECK (platform IN ('meta', 'google')),
  access_token  text        NOT NULL,
  refresh_token text,
  expires_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ad_platform_tokens_pkey            PRIMARY KEY (id),
  CONSTRAINT ad_platform_tokens_client_platform UNIQUE (client_id, platform)
);

COMMENT ON TABLE public.ad_platform_tokens IS 'Ad platform OAuth tokens per client. One token per platform. Tokens should be encrypted at rest.';
COMMENT ON COLUMN public.ad_platform_tokens.access_token  IS 'Encrypted access token. Meta: long-lived token. Google: short-lived, use refresh_token.';
COMMENT ON COLUMN public.ad_platform_tokens.refresh_token IS 'Encrypted refresh token. Only used for Google Ads OAuth2 flow.';
COMMENT ON COLUMN public.ad_platform_tokens.expires_at    IS 'Expiry timestamp for access_token. NULL means non-expiring (Meta long-lived).';

-- Indexes
CREATE INDEX idx_ad_platform_tokens_client_id ON public.ad_platform_tokens (client_id);

-- Auto-update updated_at
CREATE TRIGGER trg_ad_platform_tokens_updated_at
  BEFORE UPDATE ON public.ad_platform_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.ad_platform_tokens ENABLE ROW LEVEL SECURITY;
