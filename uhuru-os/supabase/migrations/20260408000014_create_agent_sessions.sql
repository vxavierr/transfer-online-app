-- Migration: 20260408000014_create_agent_sessions
-- Description: AI agent conversation sessions with full message history
-- Depends on: 20260408000001_create_profiles

CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text,
  messages    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  token_count integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agent_sessions_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.agent_sessions IS 'AI agent conversation sessions. Each session stores the full message history as JSONB. Context compaction is managed by the agent-harness library when token_count approaches limit.';
COMMENT ON COLUMN public.agent_sessions.title       IS 'Auto-generated from the first user message. NULL until first message processed.';
COMMENT ON COLUMN public.agent_sessions.messages    IS 'Array of { role, content, tool_use?, tool_result?, timestamp } objects';
COMMENT ON COLUMN public.agent_sessions.token_count IS 'Approximate token count for context window management. Triggers compaction when near limit (~80k).';
COMMENT ON COLUMN public.agent_sessions.is_active   IS 'false = archived/deleted session. Kept for audit purposes.';

-- Indexes
CREATE INDEX idx_sessions_user_active ON public.agent_sessions (user_id, is_active, created_at DESC);
CREATE INDEX idx_sessions_user_id     ON public.agent_sessions (user_id);

-- Auto-update updated_at
CREATE TRIGGER trg_agent_sessions_updated_at
  BEFORE UPDATE ON public.agent_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
