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

export type Supervisee = Database["public"]["Tables"]["supervisees"]["Row"];
export type SuperviseeInsert = Database["public"]["Tables"]["supervisees"]["Insert"];
export type SuperviseeUpdate = Database["public"]["Tables"]["supervisees"]["Update"];

export type SupervisionSession = Database["public"]["Tables"]["supervision_sessions"]["Row"];
export type SupervisionSessionInsert = Database["public"]["Tables"]["supervision_sessions"]["Insert"];
export type SupervisionSessionUpdate = Database["public"]["Tables"]["supervision_sessions"]["Update"];

export type SupervisionFile = Database["public"]["Tables"]["supervision_files"]["Row"];
