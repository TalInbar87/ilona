-- =============================================
-- MIGRATION v6
-- 1. Remove unique constraint on patients.id_number
-- 2. Goals bank shared across all users
-- Run in Supabase SQL Editor
-- =============================================


-- ── 1. Remove unique constraint on id_number ─────────────────────────────────
-- Supabase names unique constraints as <table>_<column>_key by default
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_id_number_key;
DROP INDEX IF EXISTS patients_id_number_key;
-- Fallback: drop any other unique index on that column
DO $$
DECLARE
  idx text;
BEGIN
  FOR idx IN
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'patients'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%id_number%'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || idx;
  END LOOP;
END $$;


-- ── 2. Goals bank — shared across all authenticated users ────────────────────

-- 2a. Replace per-user unique constraint with global unique on text alone
ALTER TABLE treatment_goals_bank
  DROP CONSTRAINT IF EXISTS treatment_goals_bank_text_created_by_key;

ALTER TABLE treatment_goals_bank
  ADD CONSTRAINT treatment_goals_bank_text_key UNIQUE (text);

-- 2b. Replace per-user RLS policy with a shared one
DROP POLICY IF EXISTS "user_owns_goals_bank" ON treatment_goals_bank;

CREATE POLICY "shared_goals_bank" ON treatment_goals_bank
  FOR ALL TO authenticated
  USING  (true)
  WITH CHECK (true);

-- 2c. Update upsert function — conflict on text only (global uniqueness)
CREATE OR REPLACE FUNCTION upsert_goal_bank(p_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO treatment_goals_bank (text, created_by, use_count)
  VALUES (trim(p_text), auth.uid(), 1)
  ON CONFLICT (text)
  DO UPDATE SET use_count = treatment_goals_bank.use_count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_goal_bank(text) TO authenticated;
