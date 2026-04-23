import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface BankGoal {
  id: string;
  text: string;
  use_count: number;
}

export function useGoalsBank() {
  const [data, setData] = useState<BankGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    const { data: rows } = await supabase
      .from("treatment_goals_bank")
      .select("id, text, use_count")
      .order("use_count", { ascending: false })
      .order("created_at");
    setData(rows ?? []);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, []);

  /** Insert new goal or increment use_count if already exists. */
  const addToBank = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Check if goal already exists (case-insensitive) directly in DB
    const { data: existing } = await supabase
      .from("treatment_goals_bank")
      .select("id, use_count")
      .ilike("text", trimmed)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("treatment_goals_bank")
        .update({ use_count: existing.use_count + 1 })
        .eq("id", existing.id);

      // Optimistic update — increment
      setData((prev) =>
        prev
          .map((g) => g.id === existing.id ? { ...g, use_count: g.use_count + 1 } : g)
          .sort((a, b) => b.use_count - a.use_count)
      );
    } else {
      const { data: inserted } = await supabase
        .from("treatment_goals_bank")
        .insert({ text: trimmed })
        .select("id, text, use_count")
        .single();

      if (inserted) {
        // Optimistic update — prepend
        setData((prev) => [inserted, ...prev]);
      }
    }
  };

  return { data, loading, addToBank, refetch };
}
