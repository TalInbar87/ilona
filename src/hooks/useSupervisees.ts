import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Supervisee } from "../types";

export function useSupervisees(search = "") {
  const [data, setData] = useState<Supervisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    let query = supabase.from("supervisees").select("*").order("full_name");
    if (search.trim()) query = query.ilike("full_name", `%${search}%`);
    const { data: rows, error: err } = await query;
    if (err) setError(err.message);
    else setData(rows ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fetch = async () => {
      let query = supabase.from("supervisees").select("*").order("full_name");
      if (search.trim()) query = query.ilike("full_name", `%${search}%`);
      const { data: rows, error: err } = await query;
      if (cancelled) return;
      if (err) setError(err.message);
      else setData(rows ?? []);
      setLoading(false);
    };
    fetch();
    return () => { cancelled = true; };
  }, [search]);

  return { data, loading, error, refetch };
}
