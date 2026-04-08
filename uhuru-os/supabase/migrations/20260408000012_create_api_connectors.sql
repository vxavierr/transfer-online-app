-- Migration: 20260408000012_create_api_connectors
-- Description: Custom API integrations registered by the owner (webhooks, external services)
-- Depends on: 20260408000001_create_profiles

CREATE TABLE IF NOT EXISTS public.api_connectors (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  base_url    text        NOT NULL,
  auth_type   text        NOT NULL CHECK (auth_type IN ('none', 'api_key', 'bearer', 'basic', 'oauth2')),
  auth_config jsonb,
  headers     jsonb,
  is_active   boolean     NOT NULL DEFAULT true,
  created_by  uuid        NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT api_connectors_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.api_connectors IS 'External API integrations defined by the owner. Credentials in auth_config are encrypted by the application layer before storage.';
COMMENT ON COLUMN public.api_connectors.auth_type   IS 'Authentication strategy: none, api_key, bearer token, basic auth, or oauth2';
COMMENT ON COLUMN public.api_connectors.auth_config IS 'Encrypted JSON. Shape varies by auth_type: {key, header} for api_key; {token} for bearer; {username, password} for basic; {client_id, client_secret, token_url} for oauth2';
COMMENT ON COLUMN public.api_connectors.headers     IS 'Static custom headers to include in every request to this connector';

-- Indexes
CREATE INDEX idx_api_connectors_created_by ON public.api_connectors (created_by);
CREATE INDEX idx_api_connectors_active     ON public.api_connectors (is_active);

-- Auto-update updated_at
CREATE TRIGGER trg_api_connectors_updated_at
  BEFORE UPDATE ON public.api_connectors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.api_connectors ENABLE ROW LEVEL SECURITY;
