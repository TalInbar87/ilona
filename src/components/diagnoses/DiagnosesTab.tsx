import { useState } from "react";
import { Plus, FileText, Upload, CheckSquare, Square, Trash2, Pencil, Check, Ear } from "lucide-react";
import { useDiagnoses } from "../../hooks/useDiagnoses";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import { FileItem } from "../files/FileItem";
import { GoalPicker } from "../goals/GoalPicker";
import type { Diagnosis } from "../../types";

// ── Goals helpers ────────────────────────────────────────────────────
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
  hearingTestDone?: boolean;
  hearingTestDate?: string | null;
  hearingTestResults?: string | null;
  onHearingTestSaved?: () => void;
}

export function DiagnosesTab({ patientId, hearingTestDone, hearingTestDate, hearingTestResults, onHearingTestSaved }: Props) {
  const { data: diagnoses, loading, refetch } = useDiagnoses(patientId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", diagnosed_at: "" });
  const [formGoals, setFormGoals] = useState<GoalItem[]>([]);
  const [saving, setSaving] = useState(false);

  const addGoal    = (text: string) => setFormGoals((p) => [...p, { id: crypto.randomUUID(), text, done: false }]);
  const toggleGoal = (id: string)   => setFormGoals((p) => p.map((g) => g.id === id ? { ...g, done: !g.done } : g));
  const removeGoal = (id: string)   => setFormGoals((p) => p.filter((g) => g.id !== id));

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
    setShowForm(false);
    setSaving(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את האבחון?")) return;
    await supabase.from("diagnoses").delete().eq("id", id);
    refetch();
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Hearing test card */}
      <HearingTestCard
        patientId={patientId}
        done={hearingTestDone ?? false}
        date={hearingTestDate ?? null}
        results={hearingTestResults ?? null}
        onSaved={onHearingTestSaved}
      />

      {/* Diagnoses header */}
      <div className="flex justify-between items-center pt-1 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">אבחונים וסיכומים</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" />
          הוספת אבחון
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <DiagnosisForm
          onSubmit={handleAddDiagnosis}
          form={form}
          setForm={setForm}
          goals={formGoals}
          onAddGoal={addGoal}
          onToggleGoal={toggleGoal}
          onRemoveGoal={removeGoal}
          saving={saving}
          onCancel={() => setShowForm(false)}
          submitLabel="הוספה"
        />
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

// ── Shared form ───────────────────────────────────────────────────────────────
function DiagnosisForm({
  onSubmit,
  form,
  setForm,
  goals,
  onAddGoal,
  onToggleGoal,
  onRemoveGoal,
  saving,
  onCancel,
  submitLabel,
  bgClass = "bg-sky-50 border border-sky-200",
}: {
  onSubmit: (e: React.FormEvent) => void;
  form: { title: string; description: string; diagnosed_at: string };
  setForm: (f: { title: string; description: string; diagnosed_at: string }) => void;
  goals: GoalItem[];
  onAddGoal: (text: string) => void;
  onToggleGoal: (id: string) => void;
  onRemoveGoal: (id: string) => void;
  saving: boolean;
  onCancel: () => void;
  submitLabel: string;
  bgClass?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={`${bgClass} rounded-xl p-4 space-y-3`}>
      <div>
        <label className="label-base text-xs">שם האבחון *</label>
        <input
          autoFocus
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input-base text-sm"
          placeholder="לדוגמה: עיכוב שפתי, גמגום..."
          required
        />
      </div>

      <div>
        <label className="label-base text-xs flex items-center gap-1">
          <CheckSquare className="w-3.5 h-3.5 text-sky-500" />
          מטרות לטיפול
        </label>
        {goals.length > 0 && (
          <ul className="mb-2 space-y-1">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center gap-2">
                <button type="button" onClick={() => onToggleGoal(g.id)} className="shrink-0 text-gray-400 hover:text-sky-600">
                  {g.done ? <CheckSquare className="w-4 h-4 text-sky-500" /> : <Square className="w-4 h-4" />}
                </button>
                <span className={`text-sm flex-1 ${g.done ? "line-through text-gray-400" : "text-gray-700"}`}>{g.text}</span>
                <button type="button" onClick={() => onRemoveGoal(g.id)} className="text-gray-300 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <GoalPicker onAdd={onAddGoal} colorScheme="sky" />
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
        <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-60 flex items-center gap-1.5">
          {saving ? "שומר..." : <><Check className="w-3.5 h-3.5" />{submitLabel}</>}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-3">
          ביטול
        </button>
      </div>
    </form>
  );
}

// ── Card (view + inline edit) ─────────────────────────────────────────────────
function DiagnosisCard({ diagnosis, patientId, onDelete, onRefetch }: {
  diagnosis: Diagnosis & { files: any[] };
  patientId: string;
  onDelete: () => void;
  onRefetch: () => void;
}) {
  const goals = parseGoals(diagnosis.goals);

  // ── Edit state ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: diagnosis.title,
    description: diagnosis.description ?? "",
    diagnosed_at: diagnosis.diagnosed_at ?? "",
  });
  const [editGoals, setEditGoals] = useState<GoalItem[]>(() => parseGoals(diagnosis.goals));
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditForm({
      title: diagnosis.title,
      description: diagnosis.description ?? "",
      diagnosed_at: diagnosis.diagnosed_at ?? "",
    });
    setEditGoals(parseGoals(diagnosis.goals));
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;
    setSaving(true);
    await supabase.from("diagnoses").update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      diagnosed_at: editForm.diagnosed_at || null,
      goals: serializeGoals(editGoals),
    }).eq("id", diagnosis.id);
    setSaving(false);
    setEditing(false);
    onRefetch();
  };

  // ── File upload ─────────────────────────────────────────────────────
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
      await supabase.from("patient_files").insert({
        patient_id: patientId, diagnosis_id: diagnosis.id,
        file_name: file.name, storage_path: storagePath,
        mime_type: mime, file_size: file.size,
      });
      onRefetch();
    }
    setUploading(false);
    e.target.value = "";
  };

  // ── Edit mode ───────────────────────────────────────────────────────
  if (editing) {
    return (
      <DiagnosisForm
        onSubmit={handleSave}
        form={editForm}
        setForm={setEditForm}
        goals={editGoals}
        onAddGoal={(text) => setEditGoals((p) => [...p, { id: crypto.randomUUID(), text, done: false }])}
        onToggleGoal={(id) => setEditGoals((p) => p.map((g) => g.id === id ? { ...g, done: !g.done } : g))}
        onRemoveGoal={(id) => setEditGoals((p) => p.filter((g) => g.id !== id))}
        saving={saving}
        onCancel={() => setEditing(false)}
        submitLabel="שמירה"
        bgClass="bg-amber-50 border border-amber-200"
      />
    );
  }

  // ── View mode ───────────────────────────────────────────────────────
  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm">{diagnosis.title}</h4>
          {diagnosis.diagnosed_at && (
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(diagnosis.diagnosed_at)}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mr-2">
          <button
            onClick={startEdit}
            className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-300 hover:text-amber-500 transition-colors"
            title="עריכה"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
            title="מחיקה"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5 text-sky-500" /> מטרות לטיפול
          </p>
          <ul className="space-y-1">
            {goals.map((g) => (
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

      {diagnosis.description && (
        <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{diagnosis.description}</p>
      )}

      {diagnosis.files?.length > 0 && (
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

// ── Hearing test card ─────────────────────────────────────────────────────────
function HearingTestCard({
  patientId,
  done,
  date,
  results,
  onSaved,
}: {
  patientId: string;
  done: boolean;
  date: string | null;
  results: string | null;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    done,
    date: date ?? "",
    results: results ?? "",
  });
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setForm({ done, date: date ?? "", results: results ?? "" });
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("patients").update({
      hearing_test_done: form.done,
      hearing_test_date: form.done && form.date ? form.date : null,
      hearing_test_results: form.done && form.results.trim() ? form.results.trim() : null,
    }).eq("id", patientId);
    setSaving(false);
    setEditing(false);
    onSaved?.();
  };

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/50 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sky-100">
        <div className="flex items-center gap-2">
          <Ear className="w-4 h-4 text-sky-600" />
          <span className="text-sm font-semibold text-sky-800">בדיקת שמיעה</span>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-400 hover:text-sky-600 transition-colors"
            title="עריכה"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* View mode */}
      {!editing && (
        <div className="px-4 py-3">
          {done ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                <span className="text-sm font-medium text-sky-700">
                  בוצעה{date ? ` — ${formatDate(date)}` : ""}
                </span>
              </div>
              {results && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap pr-4">{results}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">לא בוצעה עדיין</p>
          )}
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <form onSubmit={handleSave} className="px-4 py-3 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.done}
              onChange={(e) => setForm({ ...form, done: e.target.checked })}
              className="w-4 h-4 rounded accent-sky-600 cursor-pointer"
            />
            <span className="text-sm text-gray-700">בוצעה בדיקת שמיעה</span>
          </label>

          {form.done && (
            <>
              <div>
                <label className="label-base text-xs">תאריך ביצוע</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="input-base text-sm"
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="label-base text-xs">תוצאות הבדיקה</label>
                <textarea
                  value={form.results}
                  onChange={(e) => setForm({ ...form, results: e.target.value })}
                  className="input-base text-sm resize-none"
                  rows={3}
                  placeholder="תאר את תוצאות הבדיקה..."
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-60 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {saving ? "שומר..." : "שמירה"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5 px-3">
              ביטול
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
