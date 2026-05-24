import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface Todo {
  id: string;
  text: string;
  created_at: string;
}

export function useTodos() {
  const [data, setData] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data: rows } = await supabase
      .from("todos")
      .select("id, text, created_at")
      .order("created_at", { ascending: true });
    setData(rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const addTodo = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await supabase.from("todos").insert({ text: trimmed });
    await refetch();
  };

  const deleteTodo = async (id: string) => {
    await supabase.from("todos").delete().eq("id", id);
    setData((prev) => prev.filter((t) => t.id !== id));
  };

  return { data, loading, refetch, addTodo, deleteTodo };
}
