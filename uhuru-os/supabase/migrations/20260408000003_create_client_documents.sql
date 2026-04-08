-- Migration: 20260408000003_create_client_documents
-- Description: Documents uploaded for each client (stored in Supabase Storage)
-- Depends on: 20260408000002_create_clients

CREATE TABLE IF NOT EXISTS public.client_documents (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name   text        NOT NULL,
  file_path   text        NOT NULL,
  file_type   text        NOT NULL,
  file_size   bigint      NOT NULL,
  uploaded_by uuid        NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT client_documents_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.client_documents IS 'Documents associated with a client, stored in Supabase Storage bucket client-documents.';
COMMENT ON COLUMN public.client_documents.file_path IS 'Path within Supabase Storage bucket client-documents';
COMMENT ON COLUMN public.client_documents.file_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN public.client_documents.file_size IS 'File size in bytes';

-- Indexes
CREATE INDEX idx_client_documents_client_id   ON public.client_documents (client_id);
CREATE INDEX idx_client_documents_uploaded_by ON public.client_documents (uploaded_by);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
