import { useState, useRef, useEffect } from "react";
import { X, Upload, Paperclip, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { FileItem } from "../files/FileItem";
import type { Treatment, TreatmentFile } from "../../types";

// ── Goals checklist helpers ───────────────────
interface GoalItem {
  id: string;
  text: string;
  done: boolean;
}

function parseGoals(raw: string | null | undefined): GoalItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy plain text → single item
  return [{ id: crypto.randomUUID(), text: raw, done: false }];
}

function serializeGoals(goals: GoalItem[]): string | null {
  const nonEmpty = goals.filter((g) => g.text.trim());
  if (nonEmpty.length === 0) return null;
  return JSON.stringify(nonEmpty);
}

// ── Props ─────────────────────────────────────
interface Props {
  patientId: string;
  treatment?: Treatment;
  onClose: () => void;
  onSaved: () => void;
}

interface PendingFile {
  id: string;
  file: File;
}

export function TreatmentFormModal({ patientId, treatment, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    session_date: treatment?.session_date ?? today,
    session_time: treatment?.session_time ?? "",
    duration_min: treatment?.duration_min?.toString() ?? "",
    notes: treatment?.notes ?? "",
  });

  const [goals, setGoals] = useState<GoalItem[]>(() => parseGoals(treatment?.summary));
  const [newGoalText, setNewGoalText] = useState("");

  const [existingFiles, setExistingFiles] = useState<TreatmentFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(!!treatment?.id);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing files when editing
  useEffect(() => {
    if (!treatment?.id) return;
    supabase
      .from("treatment_files")
      .select("*")
      .eq("treatment_id", treatment.id)
      .order("uploaded_at")
      .then(({ data }) => {
        setExistingFiles(data ?? []);
        setFilesLoading(false);
      });
  }, [treatment?.id]);

  // ── Goals ──────────────────────────────────
  const addGoal = () => {
    if (!newGoalText.trim()) return;
    setGoals((prev) => [...prev, { id: crypto.randomUUID(), text: newGoalText.trim(), done: false }]);
    setNewGoalText("");
  };

  const toggleGoal = (id: string) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));

  const removeGoal = (id: string) =>
    setGoals((prev) => prev.filter((g) => g.id !== id));

  const handleGoalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addGoal(); }
  };

  // ── Files ──────────────────────────────────
  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFiles((prev) => [...prev, { id: crypto.randomUUID(), file }]);
    e.target.value = "";
  };

  const removePending = (id: string) =>
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));

  const uploadPendingFiles = async (treatmentId: string) => {
    setUploadError(null);
    for (const { file } of pendingFiles) {
      const ext = file.name.split(".").pop() ?? "bin";
      const mime = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");
      const storagePath = `${patientId}/${treatmentId}/${crypto.randomUUID()}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from(STORAGE_BUCKETS.TREATMENT_FILES)
        .upload(storagePath, file, { contentType: mime });

      if (storageErr) { setUploadError(storageErr.message); continue; }

      await supabase.from("treatment_files").insert({
        treatment_id: treatmentId,
        patient_id: patientId,
        file_name: file.name,
        storage_path: storagePath,
        mime_type: mime,
        file_size: file.size,
      });
    }
  };

  // ── Submit ─────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      patient_id: patientId,
      session_date: form.session_date,
      session_time: form.session_time || null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      summary: serializeGoals(goals),
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

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Date / Time */}
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

          {/* Duration */}
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

          {/* Goals checklist */}
          <div>
            <label className="label-base flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-sky-500" />
              מטרות טיפול
            </label>

            {goals.length > 0 && (
              <ul className="mb-2 space-y-1">
                {goals.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 group">
                    <button
                      type="button"
                      onClick={() => toggleGoal(g.id)}
                      className="shrink-0 text-gray-400 hover:text-sky-600 transition-colors"
                    >
                      {g.done
                        ? <CheckSquare className="w-4 h-4 text-sky-500" />
                        : <Square className="w-4 h-4" />}
                    </button>
                    <span className={`text-sm flex-1 ${g.done ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {g.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGoal(g.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onKeyDown={handleGoalKeyDown}
                className="input-base text-sm flex-1"
                placeholder="הוסף מטרה... (Enter לאישור)"
              />
              <button
                type="button"
                onClick={addGoal}
                disabled={!newGoalText.trim()}
                className="btn-secondary px-3 py-2 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label-base">תיעוד מפורט</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-base resize-none"
              rows={5}
              placeholder="תיעוד מפורט של הטיפול, תצפיות, התקדמות..."
            />
          </div>

          {/* Files */}
          <div>
            <label className="label-base">קבצים מצורפים</label>

            {filesLoading && (
              <div className="h-8 bg-gray-100 rounded animate-pulse mb-2" />
            )}

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

            {pendingFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                {pendingFiles.map(({ id, file }) => (
                  <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-sky-50">
                    <Paperclip className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-xs text-gray-700 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => removePending(id)} className="text-gray-300 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-red-500 mb-2">{uploadError}</p>
            )}

            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-sky-300 hover:bg-sky-50 transition-colors text-sm text-gray-500">
              <Upload className="w-4 h-4" />
              הוסף קובץ (PDF / תמונה)
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,image/*" onChange={handlePickFile} />
            </label>
          </div>

          <div className="flex gap-3 pt-1">
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
