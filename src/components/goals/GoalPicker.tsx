import { useState, useRef, useEffect } from "react";
import { Plus, BookOpen } from "lucide-react";
import { useGoalsBank } from "../../hooks/useGoalsBank";
import { useGoalCategories } from "../../hooks/useGoalCategories";

interface Props {
  onAdd: (text: string, categoryId?: string | null) => void;
  colorScheme?: "sky" | "violet";
  placeholder?: string;
}

export function GoalPicker({
  onAdd,
  colorScheme = "sky",
  placeholder = "חפש מטרה מהבנק או הוסף חדשה...",
}: Props) {
  const { data: bank, addToBank } = useGoalsBank();
  const { data: categories } = useGoalCategories();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const accent =
    colorScheme === "violet"
      ? {
          hover: "hover:bg-violet-50 hover:text-violet-700",
          add: "text-violet-600 hover:bg-violet-50",
          header: "text-gray-400 bg-gray-50",
        }
      : {
          hover: "hover:bg-sky-50 hover:text-sky-700",
          add: "text-sky-600 hover:bg-sky-50",
          header: "text-gray-400 bg-gray-50",
        };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter by category then by query
  const categoryFiltered = activeCategoryId
    ? bank.filter((g) => g.category_id === activeCategoryId)
    : bank;

  const filtered = categoryFiltered.filter(
    (g) =>
      !query.trim() ||
      g.text.toLowerCase().includes(query.trim().toLowerCase())
  );

  const exactMatch = bank.some(
    (g) => g.text.trim().toLowerCase() === query.trim().toLowerCase()
  );

  const showDropdown = open && (filtered.length > 0 || !!query.trim());

  const handleSelect = async (text: string, categoryId: string | null) => {
    await addToBank(text);
    onAdd(text, categoryId);
    setQuery("");
    setOpen(false);
  };

  const handleManual = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    await addToBank(trimmed);
    onAdd(trimmed, activeCategoryId);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategoryId(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategoryId === null
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
              onClick={() => setActiveCategoryId(activeCategoryId === cat.id ? null : cat.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategoryId === cat.id
                  ? "text-white"
                  : "text-gray-600 hover:opacity-80"
              }`}
              style={
                activeCategoryId === cat.id
                  ? { backgroundColor: cat.color }
                  : { backgroundColor: cat.color + "25", color: cat.color }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Input + dropdown */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtered.length === 1 && !query.trim()) {
                  handleSelect(filtered[0].text, filtered[0].category_id);
                } else {
                  handleManual();
                }
              }
              if (e.key === "Escape") setOpen(false);
            }}
            className="input-base text-sm flex-1"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={handleManual}
            disabled={!query.trim()}
            className="btn-secondary px-3 py-2 disabled:opacity-40 shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {filtered.length > 0 && (
              <>
                <div className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 sticky top-0 ${accent.header}`}>
                  <BookOpen className="w-3 h-3" />
                  בנק מטרות ({filtered.length})
                </div>
                {filtered.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(g.text, g.category_id)}
                    className={`w-full text-right px-4 py-2 text-sm text-gray-700 transition-colors flex items-center gap-2 ${accent.hover}`}
                  >
                    <span className="flex-1">{g.text}</span>
                    {g.category_id && categories.find(c => c.id === g.category_id) && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: categories.find(c => c.id === g.category_id)!.color + "25",
                          color: categories.find(c => c.id === g.category_id)!.color,
                        }}
                      >
                        {categories.find(c => c.id === g.category_id)!.name}
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            {query.trim() && !exactMatch && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleManual}
                className={`w-full text-right px-4 py-2 text-sm flex items-center gap-2 border-t border-gray-100 ${accent.add}`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                הוסף &ldquo;{query.trim()}&rdquo; לבנק
              </button>
            )}

            {!query.trim() && filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-gray-400 text-center">
                {activeCategoryId ? "אין מטרות בקטגוריה זו" : "הבנק ריק — הוסף מטרה ראשונה"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
