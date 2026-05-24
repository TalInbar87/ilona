import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface CalendarSupervisionSession {
  id: string;
  supervisee_id: string;
  session_date: string;
  session_time: string | null;
  duration_min: number | null;
  summary: string | null;
  supervisees: { id: string; full_name: string };
}

export function useCalendarSupervisionSessions(start?: string, end?: string) {
  const [data, setData] = useState<CalendarSupervisionSession[]>([]);

  const refetch = async () => {
    if (!start || !end) return;
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    const { data: rows } = await supabase
      .from("supervision_sessions")
      .select("id, supervisee_id, session_date, session_time, duration_min, summary, supervisees!supervisee_id(id, full_name)")
      .gte("session_date", startDate)
      .lte("session_date", endDate);
    setData((rows ?? []) as CalendarSupervisionSession[]);
  };

  useEffect(() => { refetch(); }, [start, end]);

  return { data, refetch };
}
