-- Migration v17: Goal categories
-- Adds goal_categories table + category_id FK to treatment_goals_bank and patient_goals

-- 1. Categories table
CREATE TABLE IF NOT EXISTS goal_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  color       text        NOT NULL DEFAULT '#64748b',
  sort_order  integer     NOT NULL DEFAULT 0,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_categories ALTER COLUMN created_by SET DEFAULT auth.uid();
GRANT SELECT, INSERT, UPDATE, DELETE ON goal_categories TO authenticated;

CREATE POLICY "own_data" ON goal_categories
  FOR ALL TO authenticated
  USING  (created_by = auth.uid() OR public.is_superuser())
  WITH CHECK (created_by = auth.uid() OR public.is_superuser());

-- 2. Add category_id to goals bank
ALTER TABLE treatment_goals_bank
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES goal_categories(id) ON DELETE SET NULL;

-- 3. Add category_id to patient_goals
ALTER TABLE patient_goals
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES goal_categories(id) ON DELETE SET NULL;
