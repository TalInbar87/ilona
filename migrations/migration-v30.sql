-- Migration v30: tighten storage RLS — restrict file buckets to file owner only
--
-- Previously: any authenticated user could read/write any file in these buckets.
-- Now: user can only access files whose root folder (patientId / superviseeId)
-- belongs to a patient/supervisee they own.
-- Existing files are NOT affected — paths don't change.

-- ── Drop old permissive policies ────────────────────────────────────────────
DROP POLICY IF EXISTS "storage_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;

-- ── patient-files & treatment-files ─────────────────────────────────────────
-- Path structure: {patientId}/{...}  →  foldername[1] = patientId

CREATE POLICY "patient_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('patient-files', 'treatment-files')
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.patients WHERE created_by = auth.uid()
      )
      OR public.is_superuser()
    )
  );

CREATE POLICY "patient_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('patient-files', 'treatment-files')
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.patients WHERE created_by = auth.uid()
      )
      OR public.is_superuser()
    )
  );

CREATE POLICY "patient_files_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('patient-files', 'treatment-files')
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.patients WHERE created_by = auth.uid()
      )
      OR public.is_superuser()
    )
  );

CREATE POLICY "patient_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('patient-files', 'treatment-files')
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.patients WHERE created_by = auth.uid()
      )
      OR public.is_superuser()
    )
  );

-- ── supervisee-files ─────────────────────────────────────────────────────────
-- Path structure: {superviseeId}/{sessionId}/{...}  →  foldername[1] = superviseeId

CREATE POLICY "supervisee_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'supervisee-files'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.supervisees WHERE created_by = auth.uid()
      )
      OR public.is_superuser()
    )
  );

CREATE POLICY "supervisee_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'supervisee-files'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.supervisees WHERE created_by = auth.uid()
      )
      OR public.is_superuser()
    )
  );

CREATE POLICY "supervisee_files_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'supervisee-files'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.supervisees WHERE created_by = auth.uid()
      )
      OR public.is_superuser()
    )
  );

CREATE POLICY "supervisee_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'supervisee-files'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.supervisees WHERE created_by = auth.uid()
      )
      OR public.is_superuser()
    )
  );
