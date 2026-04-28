-- migration-v19: treatment_goals junction table
-- Links patient_goals to specific treatments (snapshot per treatment).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS treatment_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES treatments(id)     ON DELETE CASCADE,
  goal_id      uuid NOT NULL REFERENCES patient_goals(id)  ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (treatment_id, goal_id)
);

CREATE INDEX IF NOT EXISTS treatment_goals_treatment_id_idx ON treatment_goals(treatment_id);

-- RLS
ALTER TABLE treatment_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON treatment_goals
  USING (
    EXISTS (
      SELECT 1 FROM treatments t
      WHERE t.id = treatment_goals.treatment_id
        AND (t.created_by = auth.uid() OR public.is_superuser())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON treatment_goals TO authenticated;
