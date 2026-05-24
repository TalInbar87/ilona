import { useState } from "react";
import { Plus, ClipboardList, ChevronLeft, Lightbulb, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTreatments } from "../../hooks/useTreatments";
import { TreatmentFormModal, type TreatmentPrefill } from "./TreatmentFormModal";
import { TreatmentsPrintModal } from "./TreatmentsPrintModal";
import { formatDate } from "../../lib/utils";
import type { Treatment } from "../../types";

interface Props {
  patientId: string;
  patientName: string;
  requiresPayment?: boolean;
  onTreatmentCountChange: () => void;
  autoOpen?: boolean;
  prefill?: TreatmentPrefill;
}

export function TreatmentsTab({ patientId, patientName, requiresPayment = false, onTreatmentCountChange, autoOpen = false, prefill }: Props) {
  const navigate = useNavigate();
  const { data: treatments, loading, refetch } = useTreatments(patientId);
  const [showForm, setShowForm] = useState(autoOpen);
  const [editTreatment, setEditTreatment] = useState<Treatment | null>(null);
  const [showPrint, setShowPrint] = useState(false);

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
        <div className="flex items-center gap-2">
          {treatments.length > 0 && (
            <button
              onClick={() => setShowPrint(true)}
              className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
            >
              <FileDown className="w-3.5 h-3.5" />
              ייצא טיפולים
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            תיעוד טיפול חדש
          </button>
        </div>
      </div>

      {/* Ideas from last treatment */}
      {treatments[0]?.next_ideas && (
        <div className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-700 mb-1">רעיונות מהטיפול האחרון</p>
            <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
              {treatments[0].next_ideas}
            </p>
          </div>
        </div>
      )}

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
              requiresPayment={requiresPayment}
              onView={() => navigate(`/patients/${patientId}/treatments/${t.id}`)}
              onEdit={() => setEditTreatment(t)}
            />
          ))}
        </div>
      )}

      {(showForm || editTreatment) && (
        <TreatmentFormModal
          patientId={patientId}
          requiresPayment={requiresPayment}
          treatment={editTreatment ?? undefined}
          prefill={editTreatment ? undefined : prefill}
          onClose={() => { setShowForm(false); setEditTreatment(null); }}
          onSaved={handleSaved}
        />
      )}

      {showPrint && (
        <TreatmentsPrintModal
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

function TreatmentRow({
  treatment,
  requiresPayment,
  onView,
  onEdit,
}: {
  treatment: Treatment;
  requiresPayment: boolean;
  onView: () => void;
  onEdit: () => void;
}) {
  // Only show payment warnings for treatments where the field was explicitly set (not null = old treatment)
  const showUnpaid = requiresPayment && treatment.payment_received === false;
  const showNoInvoice = requiresPayment && treatment.invoice_issued === false;

  return (
    <div
      className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-sky-200 hover:bg-sky-50 transition-colors group cursor-pointer"
      onClick={onView}
    >
      <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
        <ClipboardList className="w-5 h-5 text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{formatDate(treatment.session_date)}</p>
          {showUnpaid && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-red-100 text-red-600">
              טרם שולם
            </span>
          )}
          {showNoInvoice && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
              טרם הופקה חשבונית
            </span>
          )}
        </div>
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
