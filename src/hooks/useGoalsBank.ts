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
    await supabase.rpc("upsert_goal_bank", { p_text: trimmed });
    // Optimistic update so the dropdown reflects the change immediately
    setData((prev) => {
      const existing = prev.find(
        (g) => g.text.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        return prev
          .map((g) =>
            g.id === existing.id ? { ...g, use_count: g.use_count + 1 } : g
          )
          .sort((a, b) => b.use_count - a.use_count);
      }
      return [
        { id: crypto.randomUUID(), text: trimmed, use_count: 1 },
        ...prev,
      ];
    });
  };

  return { data, loading, addToBank, refetch };
}
