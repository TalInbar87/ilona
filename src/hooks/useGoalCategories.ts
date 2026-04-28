import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { GoalCategory } from "../types";

export function useGoalCategories() {
  const [data, setData] = useState<GoalCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data: rows } = await supabase
      .from("goal_categories")
      .select("*")
      .order("sort_order")
      .order("created_at");
    setData((rows ?? []) as GoalCategory[]);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}
