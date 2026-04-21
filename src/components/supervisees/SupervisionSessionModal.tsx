import { useState, useRef, useEffect } from "react";
import { X, Upload, Paperclip, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { FileItem } from "../files/FileItem";
import type { SupervisionSession, SupervisionFile } from "../../types";

// ── Goals checklist (same pattern as treatments) ──
interface GoalItem { id: string; text: string; done: boolean; }

function parseGoals(raw: string | null | undefined): GoalItem[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
  return [{ id: crypto.randomUUID(), text: raw, done: false }];
}
function serializeGoals(goals: GoalItem[]): string | null {
  const n = goals.filter((g) => g.text.trim());
  return n.length ? JSON.stringify(n) : null;
}

interface Props {
  superviseeId: string;
  session?: SupervisionSession;
  onClose: () => void;
  onSaved: () => void;
}

interface PendingFile { id: string; file: File; }

export function SupervisionSessionModal({ superviseeId, session, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    session_date: session?.session_date ?? today,
    session_time: session?.session_time ?? "",
    duration_min: session?.duration_min?.toString() ?? "",
    summary: session?.summary ?? "",
  });
  const [goals, setGoals] = useState<GoalItem[]>(() => parseGoals(session?.goals));
  const [newGoalText, setNewGoalText] = useState("");
  const [existingFiles, setExistingFiles] = useState<SupervisionFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.id) return;
    supabase.from("supervision_files").select("*").eq("session_id", session.id).order("uploaded_at")
      .then(({ data }) => setExistingFiles(data ?? []));
  }, [session?.id]);

  const addGoal = () => {
    if (!newGoalText.trim()) return;
    setGoals((p) => [...p, { id: crypto.randomUUID(), text: newGoalText.trim(), done: false }]);
    setNewGoalText("");
  };
  const toggleGoal = (id: string) => setGoals((p) => p.map((g) => g.id === id ? { ...g, done: !g.done } : g));
  const removeGoal = (id: string) => setGoals((p) => p.filter((g) => g.id !== id));

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFiles((p) => [...p, { id: crypto.randomUUID(), file }]);
    e.target.value = "";
  };

  const uploadPendingFiles = async (sessionId: string) => {
    setUploadError(null);
    for (const { file } of pendingFiles) {
      const ext = file.name.split(".").pop() ?? "bin";
      const mime = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");
      const storagePath = `${superviseeId}/${sessionId}/${crypto.randomUUID()}.${ext}`;
      const { error: se } = await supabase.storage
        .from(STORAGE_BUCKETS.SUPERVISEE_FILES)
        .upload(storagePath, file, { contentType: mime });
      if (se) { setUploadError(se.message); continue; }
      await supabase.from("supervision_files").insert({
        session_id: sessionId, supervisee_id: superviseeId,
        file_name: file.name, storage_path: storagePath, mime_type: mime, file_size: file.size,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const base = {
      session_date: form.session_date,
      session_time: form.session_time || null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      goals: serializeGoals(goals),
      summary: form.summary.trim() || null,
    };
    let sessionId = session?.id;
    if (session) {
      await supabase.from("supervision_sessions").update(base).eq("id", session.id);
    } else {
      const payload = { ...base, supervisee_id: superviseeId };
      const { data } = await supabase.from("supervision_sessions").insert(payload).select().single();
      sessionId = data?.id;
    }
    if (sessionId && pendingFiles.length > 0) await uploadPendingFiles(sessionId);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{session ? "עריכת מפגש" : "מפגש הדרכה חדש"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">תאריך *</label>
              <input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} className="input-base" required />
            </div>
            <div>
              <label className="label-base">שעה</label>
              <input type="time" value={form.session_time} onChange={(e) => setForm({ ...form, session_time: e.target.value })} className="input-base" />
            </div>
          </div>
          <div>
            <label className="label-base">משך ההדרכה (דקות)</label>
            <input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className="input-base" placeholder="60" min="1" max="480" />
          </div>

          {/* Goals checklist */}
          <div>
            <label className="label-base flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-violet-500" />
              מטרות הדרכה
            </label>
            {goals.length > 0 && (
              <ul className="mb-2 space-y-1">
                {goals.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 group">
                    <button type="button" onClick={() => toggleGoal(g.id)} className="shrink-0 text-gray-400 hover:text-violet-600">
                      {g.done ? <CheckSquare className="w-4 h-4 text-violet-500" /> : <Square className="w-4 h-4" />}
                    </button>
                    <span className={`text-sm flex-1 ${g.done ? "line-through text-gray-400" : "text-gray-700"}`}>{g.text}</span>
                    <button type="button" onClick={() => removeGoal(g.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input type="text" value={newGoalText} onChange={(e) => setNewGoalText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } }} className="input-base text-sm flex-1" placeholder="הוסף מטרה... (Enter)" />
              <button type="button" onClick={addGoal} disabled={!newGoalText.trim()} className="btn-secondary px-3 py-2 disabled:opacity-40"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="label-base">סיכום מפגש</label>
            <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="input-base resize-none" rows={4} placeholder="סיכום ורשימות מהמפגש..." />
          </div>

          {/* Files */}
          <div>
            <label className="label-base">קבצים מצורפים</label>
            {existingFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                {existingFiles.map((f) => (
                  <FileItem key={f.id} file={f as any} bucket="SUPERVISEE_FILES" onDeleted={() => setExistingFiles((p) => p.filter((x) => x.id !== f.id))} />
                ))}
              </div>
            )}
            {pendingFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                {pendingFiles.map(({ id, file }) => (
                  <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-violet-50">
                    <Paperclip className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="text-xs text-gray-700 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => setPendingFiles((p) => p.filter((x) => x.id !== id))} className="text-gray-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            {uploadError && <p className="text-xs text-red-500 mb-2">{uploadError}</p>}
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-colors text-sm text-gray-500">
              <Upload className="w-4 h-4" />
              הוסף קובץ (PDF / תמונה)
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,image/*" onChange={handlePickFile} />
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? "שומר..." : "שמירה"}</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}
