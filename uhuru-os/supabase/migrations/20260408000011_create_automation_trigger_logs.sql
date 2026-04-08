-- Migration: 20260408000011_create_automation_trigger_logs
-- Description: Execution history for automation triggers (append-only audit log)
-- Depends on: 20260408000010_create_automation_triggers

CREATE TABLE IF NOT EXISTS public.automation_trigger_logs (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  trigger_id            uuid        NOT NULL REFERENCES public.automation_triggers(id) ON DELETE CASCADE,
  campaign_id           text        NOT NULL,
  metric_value          numeric     NOT NULL,
  workflow_execution_id text,
  status                text        NOT NULL CHECK (status IN ('success', 'failed')),
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT automation_trigger_logs_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.automation_trigger_logs IS 'Immutable execution log for automation triggers. No UPDATE or DELETE policies — append-only audit trail.';
COMMENT ON COLUMN public.automation_trigger_logs.campaign_id           IS 'External campaign ID from ad platform at time of trigger';
COMMENT ON COLUMN public.automation_trigger_logs.metric_value          IS 'Actual metric value that caused the trigger to fire';
COMMENT ON COLUMN public.automation_trigger_logs.workflow_execution_id IS 'n8n execution ID returned after workflow was started. NULL if trigger failed before n8n call.';

-- Indexes
CREATE INDEX idx_automation_trigger_logs_trigger_id  ON public.automation_trigger_logs (trigger_id, created_at DESC);
CREATE INDEX idx_automation_trigger_logs_campaign_id ON public.automation_trigger_logs (campaign_id);
CREATE INDEX idx_automation_trigger_logs_status      ON public.automation_trigger_logs (status);

-- Enable RLS
ALTER TABLE public.automation_trigger_logs ENABLE ROW LEVEL SECURITY;
