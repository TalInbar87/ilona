import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { HearingTest, PatientFile } from "../types";

export interface HearingTestWithFiles extends HearingTest {
  files: PatientFile[];
}

export function useHearingTests(patientId: string | undefined) {
  const [data, setData] = useState<HearingTestWithFiles[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const [{ data: rows }, { data: files }] = await Promise.all([
      supabase
        .from("hearing_tests")
        .select("*")
        .eq("patient_id", patientId)
        .order("test_date", { ascending: false, nullsFirst: false }),
      supabase
        .from("patient_files")
        .select("*")
        .eq("patient_id", patientId)
        .not("hearing_test_id", "is", null)
        .order("uploaded_at"),
    ]);
    const merged = (rows ?? []).map((t) => ({
      ...(t as HearingTest),
      files: (files ?? []).filter((f) => f.hearing_test_id === t.id) as PatientFile[],
    }));
    setData(merged);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}
