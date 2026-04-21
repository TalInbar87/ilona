import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, Archive } from "lucide-react";
import { usePatients } from "../hooks/usePatients";
import { PatientFormModal } from "../components/patients/PatientFormModal";
import { calcAgeLabel, formatDate } from "../lib/utils";

export function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: patients, loading, refetch } = usePatients(debouncedSearch, showArchived);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">מטופלים</h1>
            <p className="text-sm text-gray-500">{patients?.length ?? 0} {showArchived ? "בארכיון" : "פעילים"}</p>
          </div>
        </div>
        {!showArchived && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">מטופל חדש</span>
            <span className="sm:hidden">חדש</span>
          </button>
        )}
      </div>

      {/* Tabs: Active / Archive */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setShowArchived(false)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${!showArchived ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          פעילים
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${showArchived ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Archive className="w-3.5 h-3.5" />
          ארכיון
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="חיפוש לפי שם או ת.ז..."
          className="input-base pr-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : patients?.length === 0 ? (
        <div className="card p-12 text-center">
          {showArchived
            ? <Archive className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            : <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />}
          <p className="text-gray-400">{showArchived ? "אין מטופלים בארכיון" : "לא נמצאו מטופלים"}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">שם מלא</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">ת.ז.</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">גיל</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">ת. לידה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">טיפולים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p: any) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="hover:bg-sky-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{p.full_name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.id_number}</td>
                    <td className="px-4 py-3 text-gray-600">{calcAgeLabel(p.date_of_birth)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.date_of_birth)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                        {p.treatment_count} טיפולים
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {patients.map((p: any) => (
              <div
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                className="card p-4 flex items-center gap-3 cursor-pointer active:bg-sky-50"
              >
                <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center shrink-0 text-sky-700 font-bold text-sm">
                  {p.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{p.full_name}</p>
                  <p className="text-xs text-gray-500">{calcAgeLabel(p.date_of_birth)} • {p.id_number}</p>
                </div>
                <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full shrink-0">
                  {p.treatment_count}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <PatientFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}
