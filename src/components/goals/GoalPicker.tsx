import { useState, useRef, useEffect } from "react";
import { Plus, BookOpen } from "lucide-react";
import { useGoalsBank } from "../../hooks/useGoalsBank";

interface Props {
  onAdd: (text: string) => void;
  colorScheme?: "sky" | "violet";
  placeholder?: string;
}

export function GoalPicker({
  onAdd,
  colorScheme = "sky",
  placeholder = "חפש מטרה מהבנק או הוסף חדשה...",
}: Props) {
  const { data: bank, addToBank } = useGoalsBank();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = bank.filter(
    (g) =>
      !query.trim() ||
      g.text.toLowerCase().includes(query.trim().toLowerCase())
  );

  const exactMatch = bank.some(
    (g) => g.text.trim().toLowerCase() === query.trim().toLowerCase()
  );

  const showDropdown = open && (filtered.length > 0 || !!query.trim());

  const handleSelect = async (text: string) => {
    await addToBank(text);
    onAdd(text);
    setQuery("");
    setOpen(false);
  };

  const handleManual = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    await addToBank(trimmed);
    onAdd(trimmed);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // If there's exactly one filtered result and it matches, select it
              if (filtered.length === 1 && !query.trim()) {
                handleSelect(filtered[0].text);
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
              <div
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 sticky top-0 ${accent.header}`}
              >
                <BookOpen className="w-3 h-3" />
                בנק מטרות ({filtered.length})
              </div>
              {filtered.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  // Prevent blur-before-click
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(g.text)}
                  className={`w-full text-right px-4 py-2 text-sm text-gray-700 transition-colors block ${accent.hover}`}
                >
                  {g.text}
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
              הבנק ריק — הוסף מטרה ראשונה
            </p>
          )}
        </div>
      )}
    </div>
  );
}
