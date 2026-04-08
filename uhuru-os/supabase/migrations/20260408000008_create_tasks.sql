-- Migration: 20260408000008_create_tasks
-- Description: Team task management with Kanban statuses and priority levels
-- Depends on: 20260408000002_create_clients

CREATE TABLE IF NOT EXISTS public.tasks (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  client_id   uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_to uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  status      text        NOT NULL DEFAULT 'backlog'
                CHECK (status IN ('backlog', 'in_progress', 'review', 'done')),
  priority    text        NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date    date,
  created_by  uuid        NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.tasks IS 'Team tasks displayed on the Kanban board. Can optionally be associated with a client.';
COMMENT ON COLUMN public.tasks.client_id   IS 'Optional client association. SET NULL on client delete to preserve task history.';
COMMENT ON COLUMN public.tasks.assigned_to IS 'User responsible for the task. SET NULL on user delete.';
COMMENT ON COLUMN public.tasks.status      IS 'Kanban column: backlog → in_progress → review → done';
COMMENT ON COLUMN public.tasks.priority    IS 'Urgency level: low < medium < high < urgent';

-- Indexes for common filter/sort patterns
CREATE INDEX idx_tasks_status   ON public.tasks (status);
CREATE INDEX idx_tasks_client   ON public.tasks (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_tasks_assigned ON public.tasks (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tasks_due_date ON public.tasks (due_date) WHERE due_date IS NOT NULL;

-- Auto-update updated_at
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
