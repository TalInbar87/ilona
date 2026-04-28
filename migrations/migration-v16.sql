-- Migration v16: patient_goals table
-- Goals become patient-scoped (not per-treatment session).
-- Existing goals are extracted from treatments.summary JSON.
-- The most-recent treatment's done status wins for each unique goal text.

-- 1. Create table
CREATE TABLE IF NOT EXISTS patient_goals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  text        text        NOT NULL,
  done        boolean     NOT NULL DEFAULT false,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Unique: one row per (patient, goal text)
ALTER TABLE patient_goals
  ADD CONSTRAINT patient_goals_patient_text_key UNIQUE (patient_id, text);

-- Index for fast patient lookups
CREATE INDEX IF NOT EXISTS patient_goals_patient_id_idx
  ON patient_goals (patient_id, sort_order, created_at);

-- 2. RLS
ALTER TABLE patient_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_goals ALTER COLUMN created_by SET DEFAULT auth.uid();

GRANT SELECT, INSERT, UPDATE, DELETE ON patient_goals TO authenticated;

CREATE POLICY "own_data" ON patient_goals
  FOR ALL TO authenticated
  USING  (created_by = auth.uid() OR public.is_superuser())
  WITH CHECK (created_by = auth.uid() OR public.is_superuser());

-- 3. Migrate existing goals from treatments.summary JSON
-- Uses DISTINCT ON to keep only the most-recent session's done status per (patient, goal text)
INSERT INTO patient_goals (patient_id, text, done, created_by, created_at)
SELECT DISTINCT ON (t.patient_id, lower(trim(elem->>'text')))
  t.patient_id,
  trim(elem->>'text')                         AS text,
  COALESCE((elem->>'done')::boolean, false)   AS done,
  t.created_by,
  t.created_at
FROM treatments t
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN t.summary IS NULL           THEN '[]'::jsonb
    WHEN t.summary LIKE '[%'         THEN t.summary::jsonb
    ELSE                                  '[]'::jsonb
  END
) AS elem
WHERE trim(elem->>'text') <> ''
ORDER BY t.patient_id, lower(trim(elem->>'text')), t.session_date DESC
ON CONFLICT (patient_id, text) DO NOTHING;

-- 4. Clear summary so app no longer reads stale JSON
--    Column is kept (not dropped) to allow rollback without ALTER TABLE.
UPDATE treatments SET summary = NULL WHERE summary IS NOT NULL;
