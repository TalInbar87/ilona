-- =============================================
-- MIGRATION v2 — Run in Supabase SQL Editor
-- =============================================

-- ── 1. Archive patients ───────────────────────
ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Recreate view with is_archived + archived_at
DROP VIEW IF EXISTS patients_with_stats;
CREATE VIEW patients_with_stats AS
SELECT
  p.*,
  EXTRACT(YEAR FROM age(p.date_of_birth))::integer AS age,
  COUNT(t.id)::integer                             AS treatment_count,
  (p.archived_at IS NOT NULL)                      AS is_archived
FROM patients p
LEFT JOIN treatments t ON t.patient_id = p.id
GROUP BY p.id;

GRANT SELECT ON patients_with_stats TO authenticated;
GRANT SELECT ON patients_with_stats TO anon;

-- ── 2. Supervisees ────────────────────────────
CREATE TABLE IF NOT EXISTS supervisees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  phone       text,
  email       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS supervision_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisee_id  uuid NOT NULL REFERENCES supervisees(id) ON DELETE CASCADE,
  session_date   date NOT NULL,
  session_time   time,
  duration_min   integer,
  goals          text,   -- JSON checklist (same format as treatments)
  summary        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS supervision_files (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES supervision_sessions(id) ON DELETE CASCADE,
  supervisee_id  uuid NOT NULL REFERENCES supervisees(id) ON DELETE CASCADE,
  file_name      text NOT NULL,
  storage_path   text NOT NULL,
  mime_type      text NOT NULL,
  file_size      bigint,
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  uploaded_by    uuid REFERENCES auth.users(id)
);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS supervisees_updated_at ON supervisees;
CREATE TRIGGER supervisees_updated_at
  BEFORE UPDATE ON supervisees FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS supervision_sessions_updated_at ON supervision_sessions;
CREATE TRIGGER supervision_sessions_updated_at
  BEFORE UPDATE ON supervision_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE supervisees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_files    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all" ON supervisees;
DROP POLICY IF EXISTS "authenticated_all" ON supervision_sessions;
DROP POLICY IF EXISTS "authenticated_all" ON supervision_files;

CREATE POLICY "authenticated_all" ON supervisees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON supervision_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON supervision_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON supervisees          TO authenticated;
GRANT ALL ON supervision_sessions TO authenticated;
GRANT ALL ON supervision_files    TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── 3. Storage RLS fix ────────────────────────
-- Drop old catch-all policies if they exist
DROP POLICY IF EXISTS "Authenticated read"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads"   ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;

-- Create clean policies for all 3 buckets
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('patient-files', 'treatment-files', 'supervisee-files'));

CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('patient-files', 'treatment-files', 'supervisee-files'));

CREATE POLICY "storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('patient-files', 'treatment-files', 'supervisee-files'));

CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('patient-files', 'treatment-files', 'supervisee-files'));

-- Also create the supervisee-files bucket (run separately if this fails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('supervisee-files', 'supervisee-files', false, 20971520, ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
