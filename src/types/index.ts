import type { Database } from "./database.types";

export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
export type PatientUpdate = Database["public"]["Tables"]["patients"]["Update"];

export type PatientWithStats =
  Database["public"]["Views"]["patients_with_stats"]["Row"];

export type Diagnosis = Database["public"]["Tables"]["diagnoses"]["Row"];
export type DiagnosisInsert =
  Database["public"]["Tables"]["diagnoses"]["Insert"];

export type PatientFile =
  Database["public"]["Tables"]["patient_files"]["Row"];
export type PatientFileInsert =
  Database["public"]["Tables"]["patient_files"]["Insert"];

export type Treatment = Database["public"]["Tables"]["treatments"]["Row"];
export type TreatmentInsert =
  Database["public"]["Tables"]["treatments"]["Insert"];
export type TreatmentUpdate =
  Database["public"]["Tables"]["treatments"]["Update"];

export type TreatmentFile =
  Database["public"]["Tables"]["treatment_files"]["Row"];
export type TreatmentFileInsert =
  Database["public"]["Tables"]["treatment_files"]["Insert"];

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert =
  Database["public"]["Tables"]["appointments"]["Insert"];
export type AppointmentUpdate =
  Database["public"]["Tables"]["appointments"]["Update"];

export type AppointmentStatus = Appointment["status"];
