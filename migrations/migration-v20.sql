-- migration-v20: backfill treatment_goals from last treatment per patient
-- For every patient, finds their most recent treatment and links ALL their
-- existing patient_goals to it as a snapshot.
-- Safe to re-run: skips treatments that already have a snapshot.

INSERT INTO treatment_goals (treatment_id, goal_id)
SELECT last_t.id   AS treatment_id,
       pg.id        AS goal_id
FROM (
  -- Most recent treatment per patient
  SELECT DISTINCT ON (patient_id) id, patient_id
  FROM   treatments
  ORDER  BY patient_id,
            session_date DESC,
            created_at   DESC
) last_t
JOIN patient_goals pg ON pg.patient_id = last_t.patient_id
WHERE NOT EXISTS (
  -- Skip if this treatment already has any snapshot rows
  SELECT 1
  FROM   treatment_goals tg
  WHERE  tg.treatment_id = last_t.id
)
ON CONFLICT (treatment_id, goal_id) DO NOTHING;
