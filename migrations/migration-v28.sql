-- Migration v28: fix hearing_tests RLS — restrict to patient owner only

-- The original authenticated_all policy (USING true) allowed any authenticated
-- user to read/write all hearing tests. Replace with ownership check via patients.

DROP POLICY IF EXISTS "authenticated_all" ON hearing_tests;

CREATE POLICY "user_owns_hearing_tests" ON hearing_tests
  FOR ALL TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE created_by = auth.uid()
    )
    OR public.is_superuser()
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE created_by = auth.uid()
    )
    OR public.is_superuser()
  );
