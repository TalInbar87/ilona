import { useState } from "react";
import { Plus, ClipboardList, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTreatments } from "../../hooks/useTreatments";
import { TreatmentFormModal, type TreatmentPrefill } from "./TreatmentFormModal";
import { formatDate } from "../../lib/utils";
import type { Treatment } from "../../types";

interface Props {
  patientId: string;
  onTreatmentCountChange: () => void;
  autoOpen?: boolean;
  prefill?: TreatmentPrefill;
}

export function TreatmentsTab({ patientId, onTreatmentCountChange, autoOpen = false, prefill }: Props) {
  const navigate = useNavigate();
  const { data: treatments, loading, refetch } = useTreatments(patientId);
  const [showForm, setShowForm] = useState(autoOpen);
  const [editTreatment, setEditTreatment] = useState<Treatment | null>(null);

  const handleSaved = () => {
    setShowForm(false);
    setEditTreatment(null);
    refetch();
    onTreatmentCountChange();
  };

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">
          תיק טיפול ({treatments.length} פגישות)
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          תיעוד טיפול חדש
        </button>
      </div>

      {treatments.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">אין טיפולים מתועדים עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {treatments.map((t) => (
            <TreatmentRow
              key={t.id}
              treatment={t}
              onView={() => navigate(`/patients/${patientId}/treatments/${t.id}`)}
              onEdit={() => setEditTreatment(t)}
            />
          ))}
        </div>
      )}

      {(showForm || editTreatment) && (
        <TreatmentFormModal
          patientId={patientId}
          treatment={editTreatment ?? undefined}
          prefill={editTreatment ? undefined : prefill}
          onClose={() => { setShowForm(false); setEditTreatment(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function TreatmentRow({
  treatment,
  onView,
  onEdit,
}: {
  treatment: Treatment;
  onView: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-sky-200 hover:bg-sky-50 transition-colors group cursor-pointer"
      onClick={onView}
    >
      <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
        <ClipboardList className="w-5 h-5 text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{formatDate(treatment.session_date)}</p>
        {treatment.notes && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{treatment.notes}</p>
        )}
        {treatment.duration_min && (
          <p className="text-xs text-gray-400">{treatment.duration_min} דקות</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded hover:bg-gray-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          עריכה
        </button>
        <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-sky-500 transition-colors" />
      </div>
    </div>
  );
}
