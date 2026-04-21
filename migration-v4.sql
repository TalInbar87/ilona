-- =============================================
-- MIGRATION v4 — Multi-user isolation
-- Run in Supabase SQL Editor
-- =============================================
-- Every user only sees and modifies their own data.
-- patients.created_by / supervisees.created_by are the
-- ownership anchors; child tables inherit via FK.
-- =============================================

-- ── 1. Auto-set created_by on INSERT ─────────
ALTER TABLE patients   ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE supervisees ALTER COLUMN created_by SET DEFAULT auth.uid();


-- ── 2. Assign existing NULL rows to current user ──
-- Safe to run if there is exactly ONE user in the system.
DO $$
DECLARE
  first_user uuid;
BEGIN
  SELECT id INTO first_user FROM auth.users ORDER BY created_at LIMIT 1;
  IF first_user IS NOT NULL THEN
    UPDATE patients    SET created_by = first_user WHERE created_by IS NULL;
    UPDATE supervisees SET created_by = first_user WHERE created_by IS NULL;
  END IF;
END $$;


-- ── 3. Drop old "anyone can do anything" policies ─

-- patients
DROP POLICY IF EXISTS "authenticated_all"          ON patients;
DROP POLICY IF EXISTS "user_owns"                  ON patients;

-- diagnoses
DROP POLICY IF EXISTS "authenticated_all"          ON diagnoses;
DROP POLICY IF EXISTS "user_owns"                  ON diagnoses;

-- patient_files
DROP POLICY IF EXISTS "authenticated_all"          ON patient_files;
DROP POLICY IF EXISTS "user_owns"                  ON patient_files;

-- treatments
DROP POLICY IF EXISTS "authenticated_all"          ON treatments;
DROP POLICY IF EXISTS "user_owns"                  ON treatments;

-- treatment_files
DROP POLICY IF EXISTS "authenticated_all"          ON treatment_files;
DROP POLICY IF EXISTS "user_owns"                  ON treatment_files;

-- appointments
DROP POLICY IF EXISTS "authenticated_all"          ON appointments;
DROP POLICY IF EXISTS "user_owns"                  ON appointments;

-- supervisees
DROP POLICY IF EXISTS "authenticated_all"          ON supervisees;
DROP POLICY IF EXISTS "user_owns_supervisees"      ON supervisees;
DROP POLICY IF EXISTS "user_owns"                  ON supervisees;

-- supervision_sessions
DROP POLICY IF EXISTS "authenticated_all"          ON supervision_sessions;
DROP POLICY IF EXISTS "user_owns"                  ON supervision_sessions;

-- supervision_files
DROP POLICY IF EXISTS "authenticated_all"          ON supervision_files;
DROP POLICY IF EXISTS "user_owns"                  ON supervision_files;


-- ── 4. New per-user RLS policies ─────────────

-- PATIENTS (direct ownership)
CREATE POLICY "user_owns_patients" ON patients
  FOR ALL TO authenticated
  USING  (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- SUPERVISEES (direct ownership)
CREATE POLICY "user_owns_supervisees" ON supervisees
  FOR ALL TO authenticated
  USING  (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DIAGNOSES (inherit via patient)
CREATE POLICY "user_owns_diagnoses" ON diagnoses
  FOR ALL TO authenticated
  USING  (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()));

-- PATIENT_FILES (inherit via patient)
CREATE POLICY "user_owns_patient_files" ON patient_files
  FOR ALL TO authenticated
  USING  (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()));

-- TREATMENTS (inherit via patient)
CREATE POLICY "user_owns_treatments" ON treatments
  FOR ALL TO authenticated
  USING  (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()));

-- TREATMENT_FILES (inherit via patient)
CREATE POLICY "user_owns_treatment_files" ON treatment_files
  FOR ALL TO authenticated
  USING  (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()));

-- APPOINTMENTS (inherit via patient)
CREATE POLICY "user_owns_appointments" ON appointments
  FOR ALL TO authenticated
  USING  (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid()));

-- SUPERVISION_SESSIONS (inherit via supervisee)
CREATE POLICY "user_owns_supervision_sessions" ON supervision_sessions
  FOR ALL TO authenticated
  USING  (supervisee_id IN (SELECT id FROM supervisees WHERE created_by = auth.uid()))
  WITH CHECK (supervisee_id IN (SELECT id FROM supervisees WHERE created_by = auth.uid()));

-- SUPERVISION_FILES (inherit via supervisee)
CREATE POLICY "user_owns_supervision_files" ON supervision_files
  FOR ALL TO authenticated
  USING  (supervisee_id IN (SELECT id FROM supervisees WHERE created_by = auth.uid()))
  WITH CHECK (supervisee_id IN (SELECT id FROM supervisees WHERE created_by = auth.uid()));


-- ── 5. Recreate view with security_invoker ───
-- security_invoker = on means the view executes with the
-- calling user's permissions, so RLS on patients applies.
DROP VIEW IF EXISTS patients_with_stats;

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

-- Only authenticated users should query this view
GRANT SELECT ON patients_with_stats TO authenticated;
REVOKE ALL    ON patients_with_stats FROM anon;
