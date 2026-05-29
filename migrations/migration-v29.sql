-- migration-v29: My Profile — signature + logo storage
-- Run in Supabase SQL editor

-- 1. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_path text,
  ADD COLUMN IF NOT EXISTS logo_path text;

-- 2. Create private storage bucket for user assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-assets',
  'user-assets',
  false,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies: each user can only access their own folder ({user_id}/...)
CREATE POLICY "user_assets_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_assets_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_assets_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_assets_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
