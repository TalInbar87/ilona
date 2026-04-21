import { useState } from "react";
import { Plus, FileText, X, Upload } from "lucide-react";
import { useDiagnoses } from "../../hooks/useDiagnoses";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import { FileItem } from "../files/FileItem";

interface Props {
  patientId: string;
}

export function DiagnosesTab({ patientId }: Props) {
  const { data: diagnoses, loading, refetch } = useDiagnoses(patientId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", diagnosed_at: "" });
  const [saving, setSaving] = useState(false);

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from("diagnoses").insert({
      patient_id: patientId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      diagnosed_at: form.diagnosed_at || null,
    });
    setForm({ title: "", description: "", diagnosed_at: "" });
    setShowForm(false);
    setSaving(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("diagnoses").delete().eq("id", id);
    refetch();
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">אבחונים וסיכומים קודמים</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          הוספת אבחון
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form onSubmit={handleAddDiagnosis} className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="label-base text-xs">שם האבחון *</label>
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-base text-sm"
              placeholder="לדוגמה: עיכוב שפתי, גמגום..."
            />
          </div>
          <div>
            <label className="label-base text-xs">תיאור</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-base text-sm resize-none"
              rows={2}
              placeholder="פרטים נוספים..."
            />
          </div>
          <div>
            <label className="label-base text-xs">תאריך אבחון</label>
            <input
              type="date"
              value={form.diagnosed_at}
              onChange={(e) => setForm({ ...form, diagnosed_at: e.target.value })}
              className="input-base text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-60">
              {saving ? "שומר..." : "הוספה"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5 px-3">
              ביטול
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {diagnoses.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">אין אבחונים עדיין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {diagnoses.map((d) => (
            <DiagnosisCard
              key={d.id}
              diagnosis={d}
              patientId={patientId}
              onDelete={() => handleDelete(d.id)}
              onRefetch={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiagnosisCard({ diagnosis, patientId, onDelete, onRefetch }: any) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${patientId}/${diagnosis.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKETS.PATIENT_FILES)
      .upload(path, file);

    if (!uploadErr) {
      await supabase.from("patient_files").insert({
        patient_id: patientId,
        diagnosis_id: diagnosis.id,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        file_size: file.size,
      });
      onRefetch();
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900 text-sm">{diagnosis.title}</h4>
          {diagnosis.diagnosed_at && (
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(diagnosis.diagnosed_at)}</p>
          )}
          {diagnosis.description && (
            <p className="text-sm text-gray-600 mt-1">{diagnosis.description}</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Files */}
      {diagnosis.files.length > 0 && (
        <div className="mt-3 space-y-1">
          {diagnosis.files.map((f: any) => (
            <FileItem key={f.id} file={f} bucket="PATIENT_FILES" onDeleted={onRefetch} />
          ))}
        </div>
      )}

      {/* Upload */}
      <label className={`mt-2 flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
        <Upload className="w-3.5 h-3.5" />
        {uploading ? "מעלה..." : "העלאת קובץ"}
        <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
      </label>
    </div>
  );
}
