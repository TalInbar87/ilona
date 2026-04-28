-- Migration v10: Rebuild patients_with_stats view to include email column
-- (PostgreSQL views with p.* do not auto-refresh when columns are added to the base table)
-- Must DROP first because CREATE OR REPLACE cannot change column ordering
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

GRANT SELECT ON patients_with_stats TO authenticated;
REVOKE ALL    ON patients_with_stats FROM anon;
