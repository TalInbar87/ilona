import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Treatment, TreatmentFile } from "../types";

export function useTreatment(id: string | undefined) {
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [files, setFiles] = useState<TreatmentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: t, error: te }, { data: f }] = await Promise.all([
      supabase.from("treatments").select("*").eq("id", id).single(),
      supabase.from("treatment_files").select("*").eq("treatment_id", id).order("uploaded_at"),
    ]);
    if (te) setError(te.message);
    else { setTreatment(t); setFiles(f ?? []); }
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [id]);

  return { treatment, files, loading, error, refetch };
}
