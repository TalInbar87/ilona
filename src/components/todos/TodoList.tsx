import { useState, useRef } from "react";
import { Plus, CheckSquare, Square, Check, X } from "lucide-react";
import { useTodos } from "../../hooks/useTodos";

interface Props {
  compact?: boolean; // true = dashboard widget, false = full page
}

export function TodoList({ compact = false }: Props) {
  const { data: todos, loading, addTodo, deleteTodo } = useTodos();
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!input.trim()) return;
    setAdding(true);
    await addTodo(input);
    setInput("");
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const handleConfirmDone = async (id: string) => {
    setDeletingId(id);
    await deleteTodo(id);
    setDeletingId(null);
    setConfirmId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Add input */}
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="הוסף משימה..."
          className="input-base flex-1 text-sm"
          disabled={adding}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !input.trim()}
          className="btn-primary px-3 py-2 disabled:opacity-50 shrink-0"
          aria-label="הוסף"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : todos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-gray-400">
          <CheckSquare className="w-8 h-8 mb-2 text-gray-200" />
          <p className="text-sm">אין משימות פתוחות</p>
        </div>
      ) : (
        <div className={`space-y-1.5 overflow-y-auto ${compact ? "max-h-56" : ""}`}>
          {todos.map((todo) => (
            <div key={todo.id}>
              {confirmId === todo.id ? (
                /* Confirmation row — two lines on mobile */
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="flex-1 text-sm text-amber-800 truncate">{todo.text}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-amber-700 font-medium flex-1">האם בוצע?</span>
                    <button
                      onClick={() => handleConfirmDone(todo.id)}
                      disabled={deletingId === todo.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors active:scale-95"
                    >
                      <Check className="w-3 h-3" />
                      כן
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors active:scale-95"
                    >
                      <X className="w-3 h-3" />
                      לא
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal row */
                <div
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => setConfirmId(todo.id)}
                >
                  <Square className="w-4 h-4 text-gray-300 group-hover:text-sky-400 shrink-0 transition-colors" />
                  <span className="flex-1 text-sm text-gray-800 truncate">{todo.text}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
