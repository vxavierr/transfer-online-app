-- Migration: 20260408000013_create_import_jobs
-- Description: CSV and Google Sheets data import job tracking
-- Depends on: 20260408000001_create_profiles

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  source_type      text        NOT NULL CHECK (source_type IN ('csv', 'google_sheets')),
  source_reference text        NOT NULL,
  target_table     text        NOT NULL,
  column_mapping   jsonb       NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  rows_imported    integer     NOT NULL DEFAULT 0,
  errors           jsonb,
  created_by       uuid        NOT NULL REFERENCES public.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT import_jobs_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.import_jobs IS 'Import job tracking for CSV uploads and Google Sheets ingestion. No updated_at — status transitions are append-like operations.';
COMMENT ON COLUMN public.import_jobs.source_reference IS 'For csv: Supabase Storage path in import-uploads bucket. For google_sheets: Sheet URL.';
COMMENT ON COLUMN public.import_jobs.column_mapping   IS 'JSON map of { "csv_column_name": "db_column_name" } for data transformation';
COMMENT ON COLUMN public.import_jobs.errors          IS 'Array of { row: number, field: string, message: string } error records';

-- Indexes
CREATE INDEX idx_import_jobs_created_by ON public.import_jobs (created_by, created_at DESC);
CREATE INDEX idx_import_jobs_status     ON public.import_jobs (status) WHERE status IN ('pending', 'processing');

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
