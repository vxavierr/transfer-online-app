-- Migration: 20260408000017_functions_and_triggers
-- Description: Utility functions, pg_cron scheduling, and Supabase Realtime config
-- Depends on: 20260408000001 through 20260408000016

-- ============================================================
-- FUNCTION: check_and_trigger_automations()
-- ============================================================
-- Called by the metrics refresh service after upsert_campaign_metrics.
-- Evaluates active triggers against the newly refreshed metrics and fires n8n
-- workflows via pg_net (HTTP) if condition is met.
-- NOTE: pg_net must be enabled in Supabase dashboard (Extensions > pg_net)

CREATE OR REPLACE FUNCTION public.check_and_trigger_automations(
  p_client_id   uuid,
  p_campaign_id text,
  p_date        date
)
RETURNS integer AS $$
DECLARE
  v_trigger    RECORD;
  v_metric_val numeric;
  v_fired      integer := 0;
BEGIN
  FOR v_trigger IN
    SELECT at_.id, at_.condition_metric, at_.condition_operator, at_.condition_value, at_.workflow_id
    FROM public.automation_triggers at_
    WHERE at_.is_active = true
      AND (at_.client_id = p_client_id OR at_.client_id IS NULL)
  LOOP
    -- Read the metric value for this campaign/date
    SELECT
      CASE v_trigger.condition_metric
        WHEN 'roas'  THEN roas
        WHEN 'spend' THEN spend
        WHEN 'ctr'   THEN ctr
        WHEN 'cpc'   THEN cpc
      END
    INTO v_metric_val
    FROM public.campaign_metrics_cache
    WHERE client_id = p_client_id
      AND campaign_id = p_campaign_id
      AND date = p_date;

    IF v_metric_val IS NULL THEN
      CONTINUE;
    END IF;

    -- Check condition
    IF (v_trigger.condition_operator = 'below' AND v_metric_val < v_trigger.condition_value)
    OR (v_trigger.condition_operator = 'above' AND v_metric_val > v_trigger.condition_value) THEN

      -- Log the trigger execution (status will be updated by application after n8n response)
      INSERT INTO public.automation_trigger_logs (trigger_id, campaign_id, metric_value, status)
      VALUES (v_trigger.id, p_campaign_id, v_metric_val, 'success');

      -- Update last_triggered_at
      UPDATE public.automation_triggers
      SET last_triggered_at = now()
      WHERE id = v_trigger.id;

      v_fired := v_fired + 1;
    END IF;
  END LOOP;

  RETURN v_fired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: evaluate_alert_rules()
-- ============================================================
-- Called after metrics refresh. Checks all active alert rules for a client/campaign/date.
-- Inserts alert records when thresholds are breached.

CREATE OR REPLACE FUNCTION public.evaluate_alert_rules(
  p_client_id   uuid,
  p_campaign_id text,
  p_date        date
)
RETURNS integer AS $$
DECLARE
  v_rule       RECORD;
  v_metric_val numeric;
  v_fired      integer := 0;
BEGIN
  FOR v_rule IN
    SELECT ar.id, ar.metric, ar.operator, ar.threshold
    FROM public.alert_rules ar
    WHERE ar.client_id = p_client_id
      AND ar.is_active = true
  LOOP
    SELECT
      CASE v_rule.metric
        WHEN 'roas'  THEN roas
        WHEN 'spend' THEN spend
        WHEN 'ctr'   THEN ctr
        WHEN 'cpc'   THEN cpc
      END
    INTO v_metric_val
    FROM public.campaign_metrics_cache
    WHERE client_id = p_client_id
      AND campaign_id = p_campaign_id
      AND date = p_date;

    IF v_metric_val IS NULL THEN
      CONTINUE;
    END IF;

    IF (v_rule.operator = 'below' AND v_metric_val < v_rule.threshold)
    OR (v_rule.operator = 'above' AND v_metric_val > v_rule.threshold) THEN
      PERFORM public.insert_alert(v_rule.id, p_campaign_id, v_metric_val);
      v_fired := v_fired + 1;
    END IF;
  END LOOP;

  RETURN v_fired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get_unacknowledged_alert_count()
-- ============================================================
-- Used by the frontend badge. Returns count scoped to current user's client access.

CREATE OR REPLACE FUNCTION public.get_unacknowledged_alert_count()
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM public.alerts al
  JOIN public.alert_rules ar ON ar.id = al.alert_rule_id
  JOIN public.clients c      ON c.id  = ar.client_id
  WHERE al.acknowledged_at IS NULL
    AND (
      public.get_user_role() = 'owner'
      OR c.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.client_id = c.id AND t.assigned_to = auth.uid()
      )
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- SUPABASE REALTIME
-- ============================================================
-- Enable Realtime for tables that need live updates in the frontend

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_sessions;

-- ============================================================
-- pg_cron: Schedule 90-day audit log cleanup
-- ============================================================
-- Requires pg_cron extension enabled in Supabase dashboard.
-- Runs daily at 03:00 UTC. Safe to run multiple times (idempotent delete).
-- Uncomment after confirming pg_cron is available in your Supabase project.

-- SELECT cron.schedule(
--   'cleanup-audit-logs-90d',
--   '0 3 * * *',
--   $$ SELECT public.cleanup_old_audit_logs() $$
-- );
