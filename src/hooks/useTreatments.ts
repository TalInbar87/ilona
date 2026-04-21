import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Treatment } from "../types";

export function useTreatments(patientId: string | undefined) {
  const [data, setData] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data: rows, error: err } = await supabase
      .from("treatments")
      .select("*")
      .eq("patient_id", patientId)
      .order("session_date", { ascending: false });

    if (err) setError(err.message);
    else setData(rows ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
  }, [patientId]);

  return { data, loading, error, refetch };
}
