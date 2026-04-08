-- Migration: 20260408000001_create_profiles
-- Description: User profiles extending auth.users with role-based access
-- Depends on: auth schema (Supabase built-in)

-- Function to handle updated_at auto-update (created once, reused by all tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles table: extends auth.users with display name, role, and avatar
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text        NOT NULL,
  role       text        NOT NULL DEFAULT 'member'
               CHECK (role IN ('owner', 'member')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users. Role controls access level across the platform.';
COMMENT ON COLUMN public.profiles.role IS 'owner: full access to all data; member: restricted to own/assigned records';

-- Auto-update updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
