-- Migration: 20260408000006_create_alert_rules
-- Description: User-defined threshold rules for campaign metric alerts
-- Depends on: 20260408000002_create_clients

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  client_id  uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric     text        NOT NULL CHECK (metric IN ('roas', 'spend', 'ctr', 'cpc')),
  operator   text        NOT NULL CHECK (operator IN ('below', 'above')),
  threshold  numeric     NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_by uuid        NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT alert_rules_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.alert_rules IS 'Threshold rules that generate alerts when campaign metrics cross defined bounds.';
COMMENT ON COLUMN public.alert_rules.metric    IS 'Which campaign metric to monitor: roas, spend, ctr, or cpc';
COMMENT ON COLUMN public.alert_rules.operator  IS 'Trigger condition: below threshold or above threshold';
COMMENT ON COLUMN public.alert_rules.threshold IS 'Numeric threshold value. Unit depends on metric (e.g., ROAS ratio, spend in currency).';
COMMENT ON COLUMN public.alert_rules.is_active IS 'Inactive rules are not evaluated during cache refresh.';

-- Indexes
CREATE INDEX idx_alert_rules_client_id  ON public.alert_rules (client_id);
CREATE INDEX idx_alert_rules_created_by ON public.alert_rules (created_by);
CREATE INDEX idx_alert_rules_active     ON public.alert_rules (client_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
