-- Migration: 20260408000009_create_task_comments
-- Description: Comments on tasks for team collaboration
-- Depends on: 20260408000008_create_tasks

CREATE TABLE IF NOT EXISTS public.task_comments (
  id        uuid        NOT NULL DEFAULT gen_random_uuid(),
  task_id   uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid        NOT NULL REFERENCES public.profiles(id),
  content   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT task_comments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.task_comments IS 'Threaded comments on tasks. Immutable after creation — no UPDATE policy. Delete allowed for author or owner.';
COMMENT ON COLUMN public.task_comments.author_id IS 'Profile who wrote the comment. No ON DELETE CASCADE — handle at application layer.';

-- Indexes
CREATE INDEX idx_task_comments_task_id   ON public.task_comments (task_id, created_at ASC);
CREATE INDEX idx_task_comments_author_id ON public.task_comments (author_id);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
