import { useState } from "react";
import { Plus, FileText, X, Upload, CheckSquare, Square, Trash2 } from "lucide-react";
import { useDiagnoses } from "../../hooks/useDiagnoses";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import { FileItem } from "../files/FileItem";

// ── Goals helpers (same pattern as treatments) ──────────────────────
interface GoalItem { id: string; text: string; done: boolean; }

function parseGoals(raw: string | null | undefined): GoalItem[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
  return [{ id: "0", text: raw, done: false }];
}
function serializeGoals(goals: GoalItem[]): string | null {
  const n = goals.filter((g) => g.text.trim());
  return n.length ? JSON.stringify(n) : null;
}

interface Props {
  patientId: string;
}

export function DiagnosesTab({ patientId }: Props) {
  const { data: diagnoses, loading, refetch } = useDiagnoses(patientId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", diagnosed_at: "" });
  const [formGoals, setFormGoals] = useState<GoalItem[]>([]);
  const [newGoalText, setNewGoalText] = useState("");
  const [saving, setSaving] = useState(false);

  const addGoal = () => {
    if (!newGoalText.trim()) return;
    setFormGoals((p) => [...p, { id: crypto.randomUUID(), text: newGoalText.trim(), done: false }]);
    setNewGoalText("");
  };
  const toggleGoal = (id: string) =>
    setFormGoals((p) => p.map((g) => g.id === id ? { ...g, done: !g.done } : g));
  const removeGoal = (id: string) =>
    setFormGoals((p) => p.filter((g) => g.id !== id));

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from("diagnoses").insert({
      patient_id: patientId,
      title: form.title.trim(),
      goals: serializeGoals(formGoals),
      description: form.description.trim() || null,
      diagnosed_at: form.diagnosed_at || null,
    });
    setForm({ title: "", description: "", diagnosed_at: "" });
    setFormGoals([]);
    setNewGoalText("");
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">אבחונים וסיכומים קודמים</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          הוספת אבחון
        </button>
      </div>

      {/* Add form */}
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

          {/* Goals checklist */}
          <div>
            <label className="label-base text-xs flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-sky-500" />
              מטרות לטיפול
            </label>
            {formGoals.length > 0 && (
              <ul className="mb-2 space-y-1">
                {formGoals.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 group">
                    <button type="button" onClick={() => toggleGoal(g.id)} className="shrink-0 text-gray-400 hover:text-sky-600">
                      {g.done ? <CheckSquare className="w-4 h-4 text-sky-500" /> : <Square className="w-4 h-4" />}
                    </button>
                    <span className={`text-sm flex-1 ${g.done ? "line-through text-gray-400" : "text-gray-700"}`}>{g.text}</span>
                    <button type="button" onClick={() => removeGoal(g.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400">
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
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } }}
                className="input-base text-sm flex-1"
                placeholder="הוסף מטרה... (Enter)"
              />
              <button type="button" onClick={addGoal} disabled={!newGoalText.trim()} className="btn-secondary px-3 py-2 disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
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
  const goals = parseGoals(diagnosis.goals);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const ext = file.name.split(".").pop() ?? "bin";
    const mime = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");
    const storagePath = `${patientId}/${diagnosis.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKETS.PATIENT_FILES)
      .upload(storagePath, file, { contentType: mime });

    if (uploadErr) {
      setUploadError(uploadErr.message);
    } else {
      const { error: dbErr } = await supabase.from("patient_files").insert({
        patient_id: patientId,
        diagnosis_id: diagnosis.id,
        file_name: file.name,
        storage_path: storagePath,
        mime_type: mime,
        file_size: file.size,
      });
      if (dbErr) setUploadError(dbErr.message);
      else onRefetch();
    }

    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm">{diagnosis.title}</h4>
          {diagnosis.diagnosed_at && (
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(diagnosis.diagnosed_at)}</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Goals checklist — above description */}
      {goals.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5 text-sky-500" /> מטרות לטיפול
          </p>
          <ul className="space-y-1">
            {goals.map((g: GoalItem) => (
              <li key={g.id} className="flex items-center gap-2">
                {g.done
                  ? <CheckSquare className="w-4 h-4 text-sky-500 shrink-0" />
                  : <Square className="w-4 h-4 text-gray-300 shrink-0" />}
                <span className={`text-sm ${g.done ? "line-through text-gray-400" : "text-gray-700"}`}>{g.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Description — below goals */}
      {diagnosis.description && (
        <p className="text-sm text-gray-600 mb-3">{diagnosis.description}</p>
      )}

      {/* Files */}
      {diagnosis.files.length > 0 && (
        <div className="mt-1 space-y-1">
          {diagnosis.files.map((f: any) => (
            <FileItem key={f.id} file={f} bucket="PATIENT_FILES" onDeleted={onRefetch} />
          ))}
        </div>
      )}

      {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
      <label className={`mt-2 flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
        <Upload className="w-3.5 h-3.5" />
        {uploading ? "מעלה..." : "העלאת קובץ"}
        <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
      </label>
    </div>
  );
}
