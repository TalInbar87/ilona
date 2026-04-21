import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { SupervisionSession, SupervisionFile } from "../types";

export function useSupervisionSessions(superviseeId: string | undefined) {
  const [data, setData] = useState<SupervisionSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!superviseeId) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("supervision_sessions")
      .select("*")
      .eq("supervisee_id", superviseeId)
      .order("session_date", { ascending: false });
    setData(rows ?? []);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [superviseeId]);

  return { data, loading, refetch };
}

export function useSupervisionSession(id: string | undefined) {
  const [session, setSession] = useState<SupervisionSession | null>(null);
  const [files, setFiles] = useState<SupervisionFile[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: s }, { data: f }] = await Promise.all([
      supabase.from("supervision_sessions").select("*").eq("id", id).single(),
      supabase.from("supervision_files").select("*").eq("session_id", id).order("uploaded_at"),
    ]);
    setSession(s);
    setFiles(f ?? []);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [id]);

  return { session, files, loading, refetch };
}
