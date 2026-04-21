-- =============================================
-- SPEECH THERAPY CLINIC - SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. PATIENTS
CREATE TABLE patients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  date_of_birth date NOT NULL,
  id_number     text NOT NULL UNIQUE,
  phone         text,
  parent_name   text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

-- 2. DIAGNOSES
CREATE TABLE diagnoses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  diagnosed_at  date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

-- 3. PATIENT FILES (for diagnoses tab)
CREATE TABLE patient_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  diagnosis_id  uuid REFERENCES diagnoses(id) ON DELETE SET NULL,
  file_name     text NOT NULL,
  storage_path  text NOT NULL,
  mime_type     text NOT NULL,
  file_size     bigint,
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  uploaded_by   uuid REFERENCES auth.users(id)
);

-- 4. TREATMENTS
CREATE TABLE treatments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_date  date NOT NULL,
  session_time  time,
  notes         text,
  summary       text,
  duration_min  integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

-- 5. TREATMENT FILES
CREATE TABLE treatment_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id  uuid NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  storage_path  text NOT NULL,
  mime_type     text NOT NULL,
  file_size     bigint,
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  uploaded_by   uuid REFERENCES auth.users(id)
);

-- 6. APPOINTMENTS (calendar)
CREATE TABLE appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  start_time    timestamptz NOT NULL,
  end_time      timestamptz NOT NULL,
  title         text,
  status        text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  treatment_id  uuid REFERENCES treatments(id) ON DELETE SET NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

-- =============================================
-- AUTO-UPDATE updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER treatments_updated_at
  BEFORE UPDATE ON treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- VIEW: patients with treatment count and age
-- =============================================
CREATE VIEW patients_with_stats AS
SELECT
  p.*,
  EXTRACT(YEAR FROM age(p.date_of_birth))::integer AS age,
  COUNT(t.id)::integer AS treatment_count
FROM patients p
LEFT JOIN treatments t ON t.patient_id = p.id
GROUP BY p.id;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE patients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON patients         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON diagnoses        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON patient_files    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON treatments       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON treatment_files  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON appointments     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard > Storage:
--   1. "patient-files"   (private)
--   2. "treatment-files" (private)
-- =============================================
