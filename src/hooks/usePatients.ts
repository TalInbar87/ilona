import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PatientWithStats } from "../types";

export function usePatients(search = "", archived = false) {
  const [data, setData] = useState<PatientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    let query = supabase
      .from("patients_with_stats")
      .select("*")
      .order("full_name");

    // Filter by archive status
    if (archived) {
      query = query.not("archived_at", "is", null);
    } else {
      query = query.is("archived_at", null);
    }

    if (search.trim()) {
      query = query.or(
        `full_name.ilike.%${search}%,id_number.ilike.%${search}%`
      );
    }

    const { data: rows, error: err } = await query;
    if (err) setError(err.message);
    else setData(rows ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetch = async () => {
      let query = supabase
        .from("patients_with_stats")
        .select("*")
        .order("full_name");

      if (archived) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }

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
  }, [search, archived]);

  return { data, loading, error, refetch };
}
