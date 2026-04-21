-- =============================================
-- MIGRATION v7 — Superuser / profiles
-- Run in Supabase SQL Editor
-- =============================================

-- ── 1. profiles table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_superuser  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Auto-create profile when a new user signs up ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users that don't have a profile yet
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT DO NOTHING;

-- ── 3. SECURITY DEFINER helper — avoids RLS recursion ─────────────────────────
-- Runs as the function owner (bypasses RLS on profiles),
-- so RLS policies can safely call it without infinite loops.
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_superuser FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_superuser() TO authenticated;

-- ── 4. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Every user can read their own profile (to know if they are a superuser)
DROP POLICY IF EXISTS "read_own_profile"    ON public.profiles;
DROP POLICY IF EXISTS "superuser_all"       ON public.profiles;

CREATE POLICY "read_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Superusers can read and update every profile (grant / revoke superuser status)
CREATE POLICY "superuser_all" ON public.profiles
  FOR ALL TO authenticated
  USING  (public.is_superuser())
  WITH CHECK (public.is_superuser());

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- ── 5. Make the very first user a superuser ───────────────────────────────────
-- Run this manually to designate your own account as the first superuser:
--   UPDATE public.profiles SET is_superuser = true
--   WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
