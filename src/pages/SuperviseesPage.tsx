import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, GraduationCap } from "lucide-react";
import { useSupervisees } from "../hooks/useSupervisees";
import { SuperviseeFormModal } from "../components/supervisees/SuperviseeFormModal";

export function SuperviseesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data: supervisees, loading, refetch } = useSupervisees(debouncedSearch);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((window as any)._supSearchTimer);
    (window as any)._supSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">מודרכות</h1>
            <p className="text-sm text-gray-500">{supervisees.length} מודרכות</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">מודרכת חדשה</span>
          <span className="sm:hidden">חדשה</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="חיפוש לפי שם..." className="input-base pr-9" />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : supervisees.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">אין מודרכות עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {supervisees.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/supervisees/${s.id}`)}
              className="card p-4 flex items-center gap-3 cursor-pointer hover:border-violet-200 hover:bg-violet-50 transition-colors"
            >
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center shrink-0 text-violet-700 font-bold text-sm">
                {s.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{s.full_name}</p>
                <p className="text-xs text-gray-500">
                  {[s.phone, s.email].filter(Boolean).join(" • ") || "אין פרטי קשר"}
                </p>
              </div>
              <GraduationCap className="w-4 h-4 text-gray-300" />
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SuperviseeFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}
