import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Meeting } from "../types";

export function useMeetings(startDate?: string, endDate?: string) {
  const [data, setData] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    setLoading(true);
    let query = supabase.from("meetings").select("*").order("start_time");
    if (startDate) query = query.gte("start_time", startDate);
    if (endDate) query = query.lte("start_time", endDate);
    const { data: rows } = await query;
    setData(rows ?? []);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [startDate, endDate]);

  return { data, loading, refetch };
}
