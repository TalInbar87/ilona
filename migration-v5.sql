-- =============================================
-- MIGRATION v5 — Goals Bank
-- Run in Supabase SQL Editor
-- =============================================

-- ── 1. Goals bank table ───────────────────────
CREATE TABLE IF NOT EXISTS treatment_goals_bank (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  text       text    NOT NULL,
  use_count  integer NOT NULL DEFAULT 1,
  created_by uuid    REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (text, created_by)
);

-- ── 2. RLS ────────────────────────────────────
ALTER TABLE treatment_goals_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_owns_goals_bank" ON treatment_goals_bank;
CREATE POLICY "user_owns_goals_bank" ON treatment_goals_bank
  FOR ALL TO authenticated
  USING  (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

GRANT ALL ON treatment_goals_bank TO authenticated;

-- ── 3. Upsert function ───────────────────────
-- Inserts a new goal (use_count=1) or increments use_count if it already exists.
CREATE OR REPLACE FUNCTION upsert_goal_bank(p_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO treatment_goals_bank (text, created_by, use_count)
  VALUES (trim(p_text), auth.uid(), 1)
  ON CONFLICT (text, created_by)
  DO UPDATE SET use_count = treatment_goals_bank.use_count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_goal_bank(text) TO authenticated;
