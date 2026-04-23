-- Migration v12: hearing_tests as separate table (replaces single columns on patients)

-- 1. New table
CREATE TABLE IF NOT EXISTS hearing_tests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_date    date,
  results      text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        REFERENCES auth.users ON DELETE SET NULL
);

ALTER TABLE hearing_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all" ON hearing_tests;
CREATE POLICY "authenticated_all" ON hearing_tests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON hearing_tests TO authenticated;

-- 2. Drop view first (depends on hearing_test columns), then drop columns
DROP VIEW IF EXISTS patients_with_stats;

ALTER TABLE patients
  DROP COLUMN IF EXISTS hearing_test_done,
  DROP COLUMN IF EXISTS hearing_test_date,
  DROP COLUMN IF EXISTS hearing_test_results;

-- 3. Rebuild view
CREATE VIEW patients_with_stats
  WITH (security_invoker = on)
AS
SELECT
  p.*,
  EXTRACT(YEAR FROM age(p.date_of_birth))::integer AS age,
  COUNT(t.id)::integer                             AS treatment_count,
  (p.archived_at IS NOT NULL)                      AS is_archived
FROM patients p
LEFT JOIN treatments t ON t.patient_id = p.id
GROUP BY p.id;

GRANT SELECT ON patients_with_stats TO authenticated;
REVOKE ALL    ON patients_with_stats FROM anon;
