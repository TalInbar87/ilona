import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { PatientGoal } from "../types";

export function usePatientGoals(patientId: string | undefined) {
  const [data, setData] = useState<PatientGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("patient_goals")
      .select("*")
      .eq("patient_id", patientId)
      .order("sort_order")
      .order("created_at");
    setData((rows ?? []) as PatientGoal[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}
