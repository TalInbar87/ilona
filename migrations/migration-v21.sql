-- migration-v21: backfill treatment_goals for ALL treatments
-- Links every treatment to all current patient_goals of the same patient.
-- Skips treatments that already have a snapshot (safe to re-run).
-- Run this instead of (or after) migration-v20.

INSERT INTO treatment_goals (treatment_id, goal_id)
SELECT t.id   AS treatment_id,
       pg.id  AS goal_id
FROM   treatments t
JOIN   patient_goals pg ON pg.patient_id = t.patient_id
WHERE  NOT EXISTS (
  SELECT 1
  FROM   treatment_goals tg
  WHERE  tg.treatment_id = t.id
)
ON CONFLICT (treatment_id, goal_id) DO NOTHING;
