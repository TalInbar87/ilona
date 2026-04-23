-- Migration v14: Fix ON DELETE behavior for all created_by / uploaded_by FK constraints
-- Previously: ON DELETE NO ACTION (RESTRICT) — deletion of a user with data would fail
-- After:      ON DELETE SET NULL — user deleted, their data stays with created_by = NULL

-- patients
ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_created_by_fkey;
ALTER TABLE patients
  ADD CONSTRAINT patients_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- diagnoses
ALTER TABLE diagnoses
  DROP CONSTRAINT IF EXISTS diagnoses_created_by_fkey;
ALTER TABLE diagnoses
  ADD CONSTRAINT diagnoses_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- patient_files
ALTER TABLE patient_files
  DROP CONSTRAINT IF EXISTS patient_files_uploaded_by_fkey;
ALTER TABLE patient_files
  ADD CONSTRAINT patient_files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- treatments
ALTER TABLE treatments
  DROP CONSTRAINT IF EXISTS treatments_created_by_fkey;
ALTER TABLE treatments
  ADD CONSTRAINT treatments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- treatment_files
ALTER TABLE treatment_files
  DROP CONSTRAINT IF EXISTS treatment_files_uploaded_by_fkey;
ALTER TABLE treatment_files
  ADD CONSTRAINT treatment_files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- appointments
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- supervisees
ALTER TABLE supervisees
  DROP CONSTRAINT IF EXISTS supervisees_created_by_fkey;
ALTER TABLE supervisees
  ADD CONSTRAINT supervisees_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- supervision_sessions
ALTER TABLE supervision_sessions
  DROP CONSTRAINT IF EXISTS supervision_sessions_created_by_fkey;
ALTER TABLE supervision_sessions
  ADD CONSTRAINT supervision_sessions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- supervision_files
ALTER TABLE supervision_files
  DROP CONSTRAINT IF EXISTS supervision_files_uploaded_by_fkey;
ALTER TABLE supervision_files
  ADD CONSTRAINT supervision_files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- treatment_goals_bank
ALTER TABLE treatment_goals_bank
  DROP CONSTRAINT IF EXISTS treatment_goals_bank_created_by_fkey;
ALTER TABLE treatment_goals_bank
  ADD CONSTRAINT treatment_goals_bank_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- meetings and hearing_tests already have ON DELETE SET NULL — no change needed
