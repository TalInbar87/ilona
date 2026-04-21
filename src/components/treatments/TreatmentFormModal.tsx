import { useState, useRef } from "react";
import { X, Upload, Paperclip } from "lucide-react";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { FileItem } from "../files/FileItem";
import type { Treatment, TreatmentFile } from "../../types";

interface Props {
  patientId: string;
  treatment?: Treatment;
  initialFiles?: TreatmentFile[];
  onClose: () => void;
  onSaved: () => void;
}

interface PendingFile {
  id: string;
  file: File;
}

export function TreatmentFormModal({ patientId, treatment, initialFiles = [], onClose, onSaved }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    session_date: treatment?.session_date ?? today,
    session_time: treatment?.session_time ?? "",
    duration_min: treatment?.duration_min?.toString() ?? "",
    summary: treatment?.summary ?? "",
    notes: treatment?.notes ?? "",
  });
  const [existingFiles, setExistingFiles] = useState<TreatmentFile[]>(initialFiles);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFiles((prev) => [...prev, { id: crypto.randomUUID(), file }]);
    e.target.value = "";
  };

  const removePending = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const uploadPendingFiles = async (treatmentId: string) => {
    for (const { file } of pendingFiles) {
      const ext = file.name.split(".").pop();
      const path = `${patientId}/${treatmentId}/${crypto.randomUUID()}.${ext}`;
      const mime = file.type || "application/octet-stream";

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.TREATMENT_FILES)
        .upload(path, file);

      if (!error) {
        await supabase.from("treatment_files").insert({
          treatment_id: treatmentId,
          patient_id: patientId,
          file_name: file.name,
          storage_path: path,
          mime_type: mime,
          file_size: file.size,
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      patient_id: patientId,
      session_date: form.session_date,
      session_time: form.session_time || null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      summary: form.summary.trim() || null,
      notes: form.notes.trim() || null,
    };

    let treatmentId = treatment?.id;

    if (treatment) {
      await supabase.from("treatments").update(payload).eq("id", treatment.id);
    } else {
      const { data } = await supabase.from("treatments").insert(payload).select().single();
      treatmentId = data?.id;
    }

    if (treatmentId && pendingFiles.length > 0) {
      await uploadPendingFiles(treatmentId);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {treatment ? "עריכת טיפול" : "תיעוד טיפול חדש"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">תאריך *</label>
              <input
                type="date"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                className="input-base"
                required
              />
            </div>
            <div>
              <label className="label-base">שעה</label>
              <input
                type="time"
                value={form.session_time}
                onChange={(e) => setForm({ ...form, session_time: e.target.value })}
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label className="label-base">משך הטיפול (דקות)</label>
            <input
              type="number"
              value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
              className="input-base"
              placeholder="45"
              min="1"
              max="300"
            />
          </div>

          <div>
            <label className="label-base">מטרות טיפול</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="input-base"
              placeholder="מטרות הפגישה..."
            />
          </div>

          <div>
            <label className="label-base">תיעוד מפורט</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-base resize-none"
              rows={6}
              placeholder="תיעוד מפורט של הטיפול, תצפיות, התקדמות..."
            />
          </div>

          {/* Files */}
          <div>
            <label className="label-base">קבצים מצורפים</label>

            {/* Existing files (edit mode) */}
            {existingFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                {existingFiles.map((f) => (
                  <FileItem
                    key={f.id}
                    file={f}
                    bucket="TREATMENT_FILES"
                    onDeleted={() => setExistingFiles((prev) => prev.filter((x) => x.id !== f.id))}
                  />
                ))}
              </div>
            )}

            {/* Pending files (queued for upload on save) */}
            {pendingFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                {pendingFiles.map(({ id, file }) => (
                  <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-sky-50">
                    <Paperclip className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-xs text-gray-700 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removePending(id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-sky-300 hover:bg-sky-50 transition-colors text-sm text-gray-500">
              <Upload className="w-4 h-4" />
              הוסף קובץ (PDF / תמונה)
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,image/*"
                onChange={handlePickFile}
              />
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "שומר..." : "שמירה"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
