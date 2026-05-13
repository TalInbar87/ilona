-- v22: Add hearing_test_id to patient_files
-- Allows uploading files linked to a specific hearing test (same bucket as diagnosis files)

ALTER TABLE patient_files
  ADD COLUMN IF NOT EXISTS hearing_test_id UUID REFERENCES hearing_tests(id) ON DELETE CASCADE;
