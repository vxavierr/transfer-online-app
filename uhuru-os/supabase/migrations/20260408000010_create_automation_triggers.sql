-- Migration: 20260408000010_create_automation_triggers
-- Description: Metric-based triggers that activate n8n workflows automatically
-- Depends on: 20260408000002_create_clients

CREATE TABLE IF NOT EXISTS public.automation_triggers (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  client_id           uuid        REFERENCES public.clients(id) ON DELETE CASCADE,
  condition_metric    text        NOT NULL CHECK (condition_metric IN ('roas', 'spend', 'ctr', 'cpc')),
  condition_operator  text        NOT NULL CHECK (condition_operator IN ('below', 'above')),
  condition_value     numeric     NOT NULL,
  workflow_id         text        NOT NULL,
  is_active           boolean     NOT NULL DEFAULT true,
  last_triggered_at   timestamptz,
  created_by          uuid        NOT NULL REFERENCES public.profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT automation_triggers_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.automation_triggers IS 'Automation rules that fire n8n workflows when campaign metrics cross thresholds. NULL client_id means the rule applies to all clients.';
COMMENT ON COLUMN public.automation_triggers.client_id        IS 'NULL = applies to all clients. Set to specific client to scope the trigger.';
COMMENT ON COLUMN public.automation_triggers.workflow_id      IS 'n8n workflow ID to execute when condition is met';
COMMENT ON COLUMN public.automation_triggers.last_triggered_at IS 'Timestamp of most recent successful execution. Used to debounce re-triggers.';

-- Indexes
CREATE INDEX idx_automation_triggers_client_id  ON public.automation_triggers (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_automation_triggers_created_by ON public.automation_triggers (created_by);
CREATE INDEX idx_automation_triggers_active     ON public.automation_triggers (condition_metric) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
