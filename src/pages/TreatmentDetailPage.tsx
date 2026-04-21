import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Clock,
  Timer,
  Upload,
  Pencil,
} from "lucide-react";
import { useTreatment } from "../hooks/useTreatment";
import { formatDate, formatDateTime } from "../lib/utils";
import { FileItem } from "../components/files/FileItem";
import { TreatmentFormModal } from "../components/treatments/TreatmentFormModal";
import { supabase, STORAGE_BUCKETS } from "../lib/supabase";

export function TreatmentDetailPage() {
  const { patientId, treatmentId } = useParams<{ patientId: string; treatmentId: string }>();
  const navigate = useNavigate();
  const { treatment, files, loading, refetch } = useTreatment(treatmentId);
  const [showEdit, setShowEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const allFiles = files;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !treatmentId || !patientId) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${patientId}/${treatmentId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.TREATMENT_FILES)
      .upload(path, file);

    if (!error) {
      const { data: newFile } = await supabase
        .from("treatment_files")
        .insert({
          treatment_id: treatmentId,
          patient_id: patientId,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (newFile) refetch();
    }
    setUploading(false);
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!treatment) {
    return <div className="p-6 text-center text-red-500">הטיפול לא נמצא</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/patients/${patientId}`)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        חזרה לכרטיס המטופל
      </button>

      {/* Header */}
      <div className="card p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">
              תיעוד טיפול — {formatDate(treatment.session_date)}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {treatment.session_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {treatment.session_time.slice(0, 5)}
                </span>
              )}
              {treatment.duration_min && (
                <span className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  {treatment.duration_min} דקות
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                נוצר: {formatDateTime(treatment.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            עריכה
          </button>
        </div>
      </div>

      {/* Summary */}
      {treatment.summary && (
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">סיכום</h3>
          <p className="text-sm text-gray-600">{treatment.summary}</p>
        </div>
      )}

      {/* Notes */}
      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">תיעוד מפורט</h3>
        {treatment.notes ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {treatment.notes}
          </p>
        ) : (
          <p className="text-sm text-gray-400">אין תיעוד מפורט לטיפול זה</p>
        )}
      </div>

      {/* Files */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            קבצים מצורפים ({allFiles.length})
          </h3>
          <label className={`flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "מעלה..." : "העלאת קובץ"}
            <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
          </label>
        </div>

        {allFiles.length === 0 ? (
          <p className="text-sm text-gray-400">אין קבצים מצורפים</p>
        ) : (
          <div className="space-y-1">
            {allFiles.map((f) => (
              <FileItem key={f.id} file={f} bucket="TREATMENT_FILES" onDeleted={refetch} />
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <TreatmentFormModal
          patientId={patientId!}
          treatment={treatment}
          initialFiles={allFiles}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); refetch(); }}
        />
      )}
    </div>
  );
}
