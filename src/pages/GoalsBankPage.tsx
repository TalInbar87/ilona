import { useState } from "react";
import {
  BookOpen, Plus, Trash2, Pencil, Check, X, Hash, Search, Settings, Tag,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useGoalsBank } from "../hooks/useGoalsBank";
import { useGoalCategories } from "../hooks/useGoalCategories";
import type { GoalCategory } from "../types";

// ── Colour palette for categories ─────────────────────────────────────────────
const COLORS = [
  "#64748b", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

// ── Categories management panel ───────────────────────────────────────────────
function CategoriesPanel({
  categories,
  onRefetch,
}: {
  categories: GoalCategory[];
  onRefetch: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[6]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await supabase.from("goal_categories").insert({
      name: newName.trim(),
      color: newColor,
      sort_order: categories.length * 10,
    });
    setNewName("");
    onRefetch();
  };

  const startEdit = (cat: GoalCategory) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    await supabase
      .from("goal_categories")
      .update({ name: editName.trim(), color: editColor })
      .eq("id", editId);
    setEditId(null);
    onRefetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק קטגוריה זו? המטרות שמשויכות אליה לא יימחקו.")) return;
    await supabase.from("goal_categories").delete().eq("id", id);
    onRefetch();
  };

  return (
    <div className="card p-4 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-4 h-4 text-sky-600" />
        <h2 className="font-semibold text-gray-800 text-sm">קטגוריות</h2>
      </div>

      {/* Existing categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) =>
            editId === cat.id ? (
              <div key={cat.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-xl bg-gray-50">
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditId(null); }}
                  className="input-base text-sm py-1 w-28"
                />
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${editColor === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button type="button" onClick={saveEdit} className="p-1 hover:bg-sky-50 rounded text-sky-500"><Check className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => setEditId(null)} className="p-1 hover:bg-gray-100 rounded text-gray-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div
                key={cat.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium group"
                style={{ backgroundColor: cat.color + "20", color: cat.color }}
              >
                <span>{cat.name}</span>
                <button
                  type="button"
                  onClick={() => startEdit(cat)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100 ml-1"
                  title="עריכה"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100"
                  title="מחיקה"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Add new category */}
      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="input-base text-sm py-1.5 flex-1 min-w-32"
          placeholder="שם קטגוריה חדשה..."
        />
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={!newName.trim()}
          className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          הוסף
        </button>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function GoalsBankPage() {
  const { data: goals, loading, addToBank, refetch } = useGoalsBank();
  const { data: categories, refetch: refetchCategories } = useGoalCategories();

  const [showCategories, setShowCategories] = useState(false);

  // ── Add ────────────────────────────────────────────
  const [newText, setNewText] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setAdding(true);
    await addToBank(newText.trim());
    // Assign category if selected
    if (newCategoryId) {
      const { data: inserted } = await supabase
        .from("treatment_goals_bank")
        .select("id")
        .ilike("text", newText.trim())
        .limit(1)
        .maybeSingle();
      if (inserted) {
        await supabase
          .from("treatment_goals_bank")
          .update({ category_id: newCategoryId })
          .eq("id", inserted.id);
      }
    }
    await refetch();
    setNewText("");
    setAdding(false);
  };

  // ── Edit ───────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");

  const startEdit = (id: string, text: string, categoryId: string | null) => {
    setEditId(id);
    setEditText(text);
    setEditCategoryId(categoryId ?? "");
  };

  const cancelEdit = () => { setEditId(null); setEditText(""); };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    await supabase
      .from("treatment_goals_bank")
      .update({ text: editText.trim(), category_id: editCategoryId || null })
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

  // ── Filter ─────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);

  const filtered = goals.filter((g) => {
    const matchText = !query.trim() || g.text.toLowerCase().includes(query.trim().toLowerCase());
    const matchCat = filterCategoryId === null || g.category_id === filterCategoryId;
    return matchText && matchCat;
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">בנק מטרות טיפול</h1>
            <p className="text-sm text-gray-400">{goals.length} מטרות שמורות</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCategories((v) => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
            showCategories
              ? "bg-sky-50 border-sky-200 text-sky-700"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Settings className="w-4 h-4" />
          קטגוריות
        </button>
      </div>

      {/* Categories panel (toggle) */}
      {showCategories && (
        <CategoriesPanel categories={categories} onRefetch={refetchCategories} />
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="card p-4 mb-5 space-y-2">
        <div className="flex gap-2 items-center">
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
        </div>
        {categories.length > 0 && (
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            className="input-base text-sm py-1.5"
          >
            <option value="">ללא קטגוריה</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        )}
      </form>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            type="button"
            onClick={() => setFilterCategoryId(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCategoryId === null
                ? "bg-gray-700 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            הכל
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={
                filterCategoryId === cat.id
                  ? { backgroundColor: cat.color, color: "#fff" }
                  : { backgroundColor: cat.color + "20", color: cat.color }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

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
            {query || filterCategoryId ? "לא נמצאו תוצאות" : "הבנק ריק — הוסף מטרה ראשונה"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((g) => {
            const cat = categories.find((c) => c.id === g.category_id);
            return (
              <li
                key={g.id}
                className="card p-3 flex items-center gap-3 group transition-shadow hover:shadow-md"
              >
                {/* Use count */}
                <span className="shrink-0 flex items-center gap-0.5 text-xs text-gray-400 min-w-[2.5rem]">
                  <Hash className="w-3 h-3" />
                  {g.use_count}
                </span>

                {/* Text or edit */}
                {editId === g.id ? (
                  <div className="flex-1 flex flex-col gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(g.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="input-base text-sm py-1"
                    />
                    {categories.length > 0 && (
                      <select
                        value={editCategoryId}
                        onChange={(e) => setEditCategoryId(e.target.value)}
                        className="input-base text-sm py-1"
                      >
                        <option value="">ללא קטגוריה</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-800 flex-1 truncate">{g.text}</span>
                    {cat && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                        style={{ backgroundColor: cat.color + "20", color: cat.color }}
                      >
                        {cat.name}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                {editId === g.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => saveEdit(g.id)} disabled={!editText.trim()} className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-500 disabled:opacity-40"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={cancelEdit} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : confirmDeleteId === g.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-red-500">למחוק?</span>
                    <button type="button" onClick={() => handleDelete(g.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => startEdit(g.id, g.text, g.category_id)} className="p-1.5 hover:bg-sky-50 rounded-lg text-gray-300 hover:text-sky-500"><Pencil className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => setConfirmDeleteId(g.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
