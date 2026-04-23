import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { HearingTest } from "../types";

export function useHearingTests(patientId: string | undefined) {
  const [data, setData] = useState<HearingTest[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("hearing_tests")
      .select("*")
      .eq("patient_id", patientId)
      .order("test_date", { ascending: false, nullsFirst: false });
    setData((rows ?? []) as HearingTest[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}
