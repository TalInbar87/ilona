-- =============================================
-- fix-permissions.sql
-- Run this in Supabase → SQL Editor if you get
-- "permission denied for table patients"
-- =============================================

-- 1. Enable RLS on all tables
ALTER TABLE patients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (in case they're broken)
DROP POLICY IF EXISTS "authenticated_all" ON patients;
DROP POLICY IF EXISTS "authenticated_all" ON diagnoses;
DROP POLICY IF EXISTS "authenticated_all" ON patient_files;
DROP POLICY IF EXISTS "authenticated_all" ON treatments;
DROP POLICY IF EXISTS "authenticated_all" ON treatment_files;
DROP POLICY IF EXISTS "authenticated_all" ON appointments;

-- 3. Re-create policies for authenticated users
CREATE POLICY "authenticated_all" ON patients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON diagnoses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON patient_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON treatments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON treatment_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Grant access to the view
GRANT SELECT ON patients_with_stats TO authenticated;
GRANT SELECT ON patients_with_stats TO anon;

-- 5. Grant table permissions explicitly
GRANT ALL ON patients         TO authenticated;
GRANT ALL ON diagnoses        TO authenticated;
GRANT ALL ON patient_files    TO authenticated;
GRANT ALL ON treatments       TO authenticated;
GRANT ALL ON treatment_files  TO authenticated;
GRANT ALL ON appointments     TO authenticated;

-- 6. Grant sequence permissions (for inserts)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Done. Verify with:
-- SELECT * FROM patients_with_stats LIMIT 1;
