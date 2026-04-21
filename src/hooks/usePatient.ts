import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PatientWithStats } from "../types";

export function usePatient(id: string | undefined) {
  const [data, setData] = useState<PatientWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!id) return;
    setLoading(true);
    const { data: row, error: err } = await supabase
      .from("patients_with_stats")
      .select("*")
      .eq("id", id)
      .single();

    if (err) setError(err.message);
    else setData(row);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
  }, [id]);

  return { data, loading, error, refetch };
}
