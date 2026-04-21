import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Diagnosis, PatientFile } from "../types";

export interface DiagnosisWithFiles extends Diagnosis {
  files: PatientFile[];
}

export function useDiagnoses(patientId: string | undefined) {
  const [data, setData] = useState<DiagnosisWithFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);

    const [{ data: diags, error: de }, { data: files, error: fe }] =
      await Promise.all([
        supabase
          .from("diagnoses")
          .select("*")
          .eq("patient_id", patientId)
          .order("diagnosed_at", { ascending: false }),
        supabase
          .from("patient_files")
          .select("*")
          .eq("patient_id", patientId)
          .order("uploaded_at"),
      ]);

    if (de || fe) { setError((de || fe)!.message); setLoading(false); return; }

    const merged = (diags ?? []).map((d) => ({
      ...d,
      files: (files ?? []).filter((f) => f.diagnosis_id === d.id),
    }));
    setData(merged);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [patientId]);

  return { data, loading, error, refetch };
}
