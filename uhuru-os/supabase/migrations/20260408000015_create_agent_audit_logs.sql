-- Migration: 20260408000015_create_agent_audit_logs
-- Description: Immutable audit log of every tool invocation by the AI agent
-- Depends on: 20260408000014_create_agent_sessions
-- Security: INSERT via SECURITY DEFINER only (post-tool hook). No UPDATE or DELETE.

CREATE TABLE IF NOT EXISTS public.agent_audit_logs (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  tool_name   text        NOT NULL,
  input       jsonb       NOT NULL,
  output      jsonb       NOT NULL,
  duration_ms integer     NOT NULL,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agent_audit_logs_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.agent_audit_logs IS 'Immutable audit log of AI agent tool invocations. Inserted exclusively via insert_agent_audit_log() SECURITY DEFINER function from the post-tool hook. Retention: minimum 90 days (NFR7).';
COMMENT ON COLUMN public.agent_audit_logs.user_id     IS 'Denormalized from session for faster per-user audit queries without JOIN';
COMMENT ON COLUMN public.agent_audit_logs.input       IS 'Sanitized tool input — sensitive fields (tokens, passwords) must be redacted by the application layer before logging';
COMMENT ON COLUMN public.agent_audit_logs.output      IS 'Tool execution result. Truncated if excessively large.';
COMMENT ON COLUMN public.agent_audit_logs.duration_ms IS 'Tool execution wall-clock time in milliseconds';

-- Indexes
CREATE INDEX idx_audit_user_created ON public.agent_audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_session      ON public.agent_audit_logs (session_id, created_at DESC);
CREATE INDEX idx_audit_tool_name    ON public.agent_audit_logs (tool_name);

-- SECURITY DEFINER insert function — called by agent-harness post-tool hook
CREATE OR REPLACE FUNCTION public.insert_agent_audit_log(
  p_session_id  uuid,
  p_tool_name   text,
  p_input       jsonb,
  p_output      jsonb,
  p_duration_ms integer,
  p_user_id     uuid
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.agent_audit_logs (session_id, tool_name, input, output, duration_ms, user_id)
  VALUES (p_session_id, p_tool_name, p_input, p_output, p_duration_ms, p_user_id)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 90-day retention cleanup function (to be scheduled via pg_cron or external cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS integer AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.agent_audit_logs
  WHERE created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.agent_audit_logs ENABLE ROW LEVEL SECURITY;
