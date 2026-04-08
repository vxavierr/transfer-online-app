-- Migration: 20260408000007_create_alerts
-- Description: Alert instances triggered when campaign metrics cross rule thresholds
-- Depends on: 20260408000006_create_alert_rules

CREATE TABLE IF NOT EXISTS public.alerts (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  alert_rule_id    uuid        NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  campaign_id      text        NOT NULL,
  current_value    numeric     NOT NULL,
  triggered_at     timestamptz NOT NULL DEFAULT now(),
  acknowledged_at  timestamptz,
  acknowledged_by  uuid        REFERENCES public.profiles(id),

  CONSTRAINT alerts_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.alerts IS 'Individual alert events triggered by alert_rules. Inserted by SECURITY DEFINER function during metrics refresh. Append-only — no UPDATE by users except for acknowledged_at.';
COMMENT ON COLUMN public.alerts.campaign_id     IS 'External campaign ID from the ad platform (not an FK — platform-specific string)';
COMMENT ON COLUMN public.alerts.current_value   IS 'Metric value at the time the alert was triggered';
COMMENT ON COLUMN public.alerts.acknowledged_at IS 'NULL = unacknowledged. Set when a user acknowledges the alert.';

-- Indexes
CREATE INDEX idx_alerts_alert_rule_id      ON public.alerts (alert_rule_id);
CREATE INDEX idx_alerts_unacknowledged     ON public.alerts (triggered_at DESC) WHERE acknowledged_at IS NULL;
CREATE INDEX idx_alerts_campaign_id        ON public.alerts (campaign_id);

-- SECURITY DEFINER function for service-layer inserts during metrics refresh
CREATE OR REPLACE FUNCTION public.insert_alert(
  p_alert_rule_id uuid,
  p_campaign_id   text,
  p_current_value numeric
)
RETURNS uuid AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO public.alerts (alert_rule_id, campaign_id, current_value)
  VALUES (p_alert_rule_id, p_campaign_id, p_current_value)
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
