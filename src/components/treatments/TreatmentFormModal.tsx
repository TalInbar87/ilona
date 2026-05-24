import { useState, useRef, useEffect } from "react";
import { X, Upload, Paperclip, Trash2, CheckSquare, Square, Wrench, Lightbulb } from "lucide-react";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { FileItem } from "../files/FileItem";
import { GoalPicker } from "../goals/GoalPicker";
import type { Treatment, TreatmentFile } from "../../types";

// ── Goal type ─────────────────────────────────
// source="db"  → row already exists in patient_goals (id = real DB uuid)
// source="new" → added in this session, not yet persisted
type GoalSource = "db" | "new";

interface LocalGoal {
  id: string;
  text: string;
  done: boolean;
  source: GoalSource;
  originalDone?: boolean; // for DB goals: snapshot for change detection
  categoryId?: string | null;
}

// Sync goals to patient_goals + save treatment_goals snapshot.
// Removing a goal from the treatment view never deletes it from patient_goals.
async function syncGoals(
  goals: LocalGoal[],
  patientId: string,
  treatmentId: string,
): Promise<void> {
  // 1. Update done status for DB goals whose status changed
  for (const g of goals.filter(g => g.source === "db" && g.done !== g.originalDone)) {
    await supabase.from("patient_goals").update({ done: g.done }).eq("id", g.id);
  }

  // 2. Upsert new goals into patient_goals
  const newGoals = goals.filter(g => g.source === "new" && g.text.trim());
  if (newGoals.length > 0) {
    await supabase.from("patient_goals").upsert(
      newGoals.map(g => ({ patient_id: patientId, text: g.text.trim(), done: g.done, category_id: g.categoryId ?? null })),
      { onConflict: "patient_id,text" }
    );
  }

  // 3. Resolve IDs of newly inserted goals
  let newGoalIds: string[] = [];
  if (newGoals.length > 0) {
    const { data: inserted } = await supabase
      .from("patient_goals")
      .select("id")
      .eq("patient_id", patientId)
      .in("text", newGoals.map(g => g.text.trim()));
    newGoalIds = inserted?.map(g => g.id) ?? [];
  }

  // 4. Save treatment_goals snapshot (replace existing)
  const dbGoalIds = goals.filter(g => g.source === "db").map(g => g.id);
  const allGoalIds = [...dbGoalIds, ...newGoalIds];

  await supabase.from("treatment_goals").delete().eq("treatment_id", treatmentId);
  if (allGoalIds.length > 0) {
    await supabase.from("treatment_goals").insert(
      allGoalIds.map(goal_id => ({ treatment_id: treatmentId, goal_id }))
    );
  }
}

// ── Props ─────────────────────────────────────
export interface TreatmentPrefill {
  session_date?: string;
  session_time?: string;
  duration_min?: number;
}

interface Props {
  patientId: string;
  requiresPayment?: boolean;
  treatment?: Treatment;
  prefill?: TreatmentPrefill;
  onClose: () => void;
  onSaved: () => void;
}

interface PendingFile {
  id: string;
  file: File;
}

export function TreatmentFormModal({ patientId, requiresPayment = false, treatment, prefill, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    session_date: treatment?.session_date ?? prefill?.session_date ?? today,
    session_time: treatment?.session_time ?? prefill?.session_time ?? "",
    duration_min: treatment?.duration_min?.toString() ?? prefill?.duration_min?.toString() ?? "",
    tools: treatment?.tools ?? "",
    notes: treatment?.notes ?? "",
    next_ideas: treatment?.next_ideas ?? "",
  });

  const [paymentReceived, setPaymentReceived] = useState<boolean | null>(treatment?.payment_received ?? null);
  const [invoiceIssued, setInvoiceIssued] = useState<boolean | null>(treatment?.invoice_issued ?? null);

  const [goals, setGoals] = useState<LocalGoal[]>([]);

  const [existingFiles, setExistingFiles] = useState<TreatmentFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(!!treatment?.id);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load goals ────────────────────────────────────────────────────────────
  // Edit mode   → load goals from this treatment's treatment_goals snapshot
  //               (fallback: all patient_goals for pre-migration treatments)
  // New mode    → load goals from the LAST treatment's snapshot (empty if none)
  useEffect(() => {
    const toLocal = (rows: { id: string; text: string; done: boolean; category_id: string | null }[]) =>
      rows.map(g => ({
        id: g.id, text: g.text, done: g.done,
        source: "db" as GoalSource, originalDone: g.done,
        categoryId: g.category_id,
      }));

    const loadFromTreatmentSnapshot = async (treatmentId: string) => {
      const { data: tg } = await supabase
        .from("treatment_goals")
        .select("goal_id")
        .eq("treatment_id", treatmentId);
      if (!tg || tg.length === 0) return null; // no snapshot
      const { data: rows } = await supabase
        .from("patient_goals")
        .select("id, text, done, category_id")
        .in("id", tg.map(r => r.goal_id))
        .order("sort_order").order("created_at");
      return toLocal(rows ?? []);
    };

    const load = async () => {
      if (treatment?.id) {
        // Editing — load this treatment's snapshot, fallback to all goals
        const fromSnapshot = await loadFromTreatmentSnapshot(treatment.id);
        if (fromSnapshot) { setGoals(fromSnapshot); return; }
        const { data: rows } = await supabase
          .from("patient_goals").select("id, text, done, category_id")
          .eq("patient_id", patientId).order("sort_order").order("created_at");
        setGoals(toLocal(rows ?? []));
      } else {
        // New treatment — load from last treatment's snapshot
        const { data: last } = await supabase
          .from("treatments").select("id")
          .eq("patient_id", patientId)
          .order("session_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle();
        if (!last) { setGoals([]); return; }
        const fromSnapshot = await loadFromTreatmentSnapshot(last.id);
        setGoals(fromSnapshot ?? []);
      }
    };

    load();
  }, [patientId, treatment?.id]);

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
  const addGoal = (text: string, categoryId?: string | null) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoals(prev => {
      // Goal already in list?
      const existing = prev.find(g => g.text.trim() === trimmed);
      if (existing) {
        // Was completed → restore to active (updates patient_goals on save via syncGoals)
        if (existing.done) return prev.map(g => g.id === existing.id ? { ...g, done: false } : g);
        // Already active → no-op
        return prev;
      }
      return [...prev, { id: crypto.randomUUID(), text: trimmed, done: false, source: "new" as GoalSource, categoryId }];
    });
  };

  const toggleGoal = (id: string) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));

  // Removes goal from this treatment's view only — does NOT delete from patient_goals
  const removeGoal = (id: string) =>
    setGoals((prev) => prev.filter(g => g.id !== id));

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
      // summary no longer used — goals live in patient_goals
      tools: form.tools.trim() || null,
      notes: form.notes.trim() || null,
      next_ideas: form.next_ideas.trim() || null,
      ...(requiresPayment ? { payment_received: paymentReceived, invoice_issued: invoiceIssued } : {}),
    };

    let treatmentId = treatment?.id;

    if (treatment) {
      await supabase.from("treatments").update(payload).eq("id", treatment.id);
    } else {
      const { data } = await supabase.from("treatments").insert(payload).select().single();
      treatmentId = data?.id;
    }

    // Sync goals to patient_goals table + save treatment_goals snapshot
    if (treatmentId) {
      await syncGoals(goals, patientId, treatmentId);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Payment — shown only when patient requires payment */}
          {requiresPayment && (
            <div className="space-y-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">האם התקבל תשלום?</label>
                <YesNoToggle value={paymentReceived} onChange={setPaymentReceived} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">האם הופקה חשבונית?</label>
                <YesNoToggle value={invoiceIssued} onChange={setInvoiceIssued} />
              </div>
            </div>
          )}

          {/* Goals checklist */}
          <div>
            <label className="label-base flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-sky-500" />
              מטרות טיפול
            </label>

            {/* Active goals */}
            {goals.filter(g => !g.done).length > 0 && (
              <ul className="mb-2 space-y-1">
                {goals.filter(g => !g.done).map((g) => (
                  <li key={g.id} className="flex items-center gap-2 group">
                    <button
                      type="button"
                      onClick={() => toggleGoal(g.id)}
                      className="shrink-0 text-gray-400 hover:text-sky-600 transition-colors"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <span className="text-sm flex-1 text-gray-700">{g.text}</span>
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

            <GoalPicker onAdd={addGoal} colorScheme="sky" />

            {/* Completed goals */}
            {goals.filter(g => g.done).length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-400 mb-1.5">🏅 הושלמו</p>
                <ul className="space-y-1">
                  {goals.filter(g => g.done).map((g) => (
                    <li key={g.id} className="flex items-center gap-2 group">
                      <button
                        type="button"
                        onClick={() => toggleGoal(g.id)}
                        className="shrink-0 text-sky-400 hover:text-gray-400 transition-colors"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <span className="text-sm flex-1 line-through text-gray-400">{g.text}</span>
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
              </div>
            )}
          </div>

          {/* Tools / Aids */}
          <div>
            <label className="label-base flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-violet-400" />
              עזרים לטיפול
            </label>
            <textarea
              value={form.tools}
              onChange={(e) => setForm({ ...form, tools: e.target.value })}
              className="input-base resize-none"
              rows={2}
              placeholder="כרטיסיות, משחקים, חומרים, אפליקציות..."
            />
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

          {/* Next session ideas */}
          <div>
            <label className="label-base flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              תכנון טיפול הבא
            </label>
            <textarea
              value={form.next_ideas}
              onChange={(e) => setForm({ ...form, next_ideas: e.target.value })}
              className="input-base resize-none"
              rows={3}
              placeholder="מה לנסות בפגישה הבאה, נושאים להמשך..."
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

function YesNoToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          value === true
            ? "bg-emerald-500 text-white border-emerald-500"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
        }`}
      >
        כן
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          value === false
            ? "bg-red-500 text-white border-red-500"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
        }`}
      >
        לא
      </button>
    </div>
  );
}
