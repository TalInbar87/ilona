-- Migration v11: Add hearing test fields to patients
alter table patients
  add column if not exists hearing_test_done    boolean not null default false,
  add column if not exists hearing_test_date    date,
  add column if not exists hearing_test_results text;

-- Rebuild view to expose new columns
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
