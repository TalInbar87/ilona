import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PatientWithStats } from "../types";

export function usePatients(search = "") {
  const [data, setData] = useState<PatientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetch = async () => {
      let query = supabase
        .from("patients_with_stats")
        .select("*")
        .order("full_name");

      if (search.trim()) {
        query = query.or(
          `full_name.ilike.%${search}%,id_number.ilike.%${search}%`
        );
      }

      const { data: rows, error: err } = await query;
      if (cancelled) return;
      if (err) setError(err.message);
      else setData(rows ?? []);
      setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [search]);

  return { data, loading, error };
}
