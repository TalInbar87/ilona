import { useState } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Hash,
  Search,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useGoalsBank } from "../hooks/useGoalsBank";

export function GoalsBankPage() {
  const { data: goals, loading, addToBank, refetch } = useGoalsBank();

  // ── Add ────────────────────────────────────────────
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setAdding(true);
    await addToBank(newText.trim());
    await refetch();
    setNewText("");
    setAdding(false);
  };

  // ── Edit ───────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const startEdit = (id: string, text: string) => {
    setEditId(id);
    setEditText(text);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditText("");
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    await supabase
      .from("treatment_goals_bank")
      .update({ text: editText.trim() })
      .eq("id", id);
    setEditId(null);
    refetch();
  };

  // ── Delete ─────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await supabase.from("treatment_goals_bank").delete().eq("id", id);
    setConfirmDeleteId(null);
    refetch();
  };

  // ── Search / filter ────────────────────────────────
  const [query, setQuery] = useState("");
  const filtered = goals.filter(
    (g) =>
      !query.trim() || g.text.toLowerCase().includes(query.trim().toLowerCase())
  );

  // ── Render ─────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">בנק מטרות טיפול</h1>
          <p className="text-sm text-gray-400">
            {goals.length} מטרות שמורות · ממוין לפי שימוש
          </p>
        </div>
      </div>

      {/* Add form */}
      <form
        onSubmit={handleAdd}
        className="card p-4 mb-5 flex gap-2 items-center"
      >
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="input-base flex-1 text-sm"
          placeholder="הוסף מטרה חדשה לבנק..."
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || !newText.trim()}
          className="btn-primary flex items-center gap-1.5 py-2 px-4 disabled:opacity-50 shrink-0"
        >
          <Plus className="w-4 h-4" />
          הוסף
        </button>
      </form>

      {/* Search */}
      {goals.length > 5 && (
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-base pr-9 text-sm"
            placeholder="חיפוש מטרה..."
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">
            {query ? "לא נמצאו תוצאות" : "הבנק ריק — הוסף מטרה ראשונה"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((g) => (
            <li
              key={g.id}
              className="card p-3 flex items-center gap-3 group transition-shadow hover:shadow-md"
            >
              {/* Use count badge */}
              <span
                title={`שימוש ${g.use_count} פעמים`}
                className="shrink-0 flex items-center gap-0.5 text-xs text-gray-400 min-w-[2.5rem]"
              >
                <Hash className="w-3 h-3" />
                {g.use_count}
              </span>

              {/* Text — or edit input */}
              {editId === g.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(g.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="input-base text-sm flex-1 py-1"
                />
              ) : (
                <span className="text-sm text-gray-800 flex-1">{g.text}</span>
              )}

              {/* Actions */}
              {editId === g.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => saveEdit(g.id)}
                    disabled={!editText.trim()}
                    className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-500 disabled:opacity-40"
                    title="שמור"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                    title="ביטול"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : confirmDeleteId === g.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-red-500">למחוק?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(g.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"
                    title="אישור מחיקה"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                    title="ביטול"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEdit(g.id, g.text)}
                    className="p-1.5 hover:bg-sky-50 rounded-lg text-gray-300 hover:text-sky-500"
                    title="עריכה"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(g.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400"
                    title="מחיקה"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
