import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, GraduationCap, Phone, Mail, Plus, Pencil, ClipboardList, ChevronLeft, CheckSquare, Square, Upload } from "lucide-react";
import { supabase, STORAGE_BUCKETS } from "../lib/supabase";
import { useSupervisees } from "../hooks/useSupervisees";
import { useSupervisionSessions, useSupervisionSession } from "../hooks/useSupervisionSessions";
import { SuperviseeFormModal } from "../components/supervisees/SuperviseeFormModal";
import { SupervisionSessionModal } from "../components/supervisees/SupervisionSessionModal";
import { FileItem } from "../components/files/FileItem";
import { formatDate } from "../lib/utils";
import type { SupervisionSession } from "../types";

// ── Goal display ──────────────────────────────
interface GoalItem { id: string; text: string; done: boolean; }
function parseGoals(raw: string | null | undefined): GoalItem[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
  return [{ id: "0", text: raw, done: false }];
}

export function SuperviseeDetailPage() {
  const { superviseeId } = useParams<{ superviseeId: string }>();
  const navigate = useNavigate();

  // Fetch supervisee from list (simple approach)
  const { data: all } = useSupervisees();
  const supervisee = all.find((s) => s.id === superviseeId) ?? null;

  const { data: sessions, loading: sessionsLoading, refetch: refetchSessions } = useSupervisionSessions(superviseeId);
  const [showEdit, setShowEdit] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editSession, setEditSession] = useState<SupervisionSession | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!superviseeId) return null;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate("/supervisees")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
        <ArrowRight className="w-4 h-4" />
        חזרה למודרכות
      </button>

      {/* Header */}
      <div className="card p-4 md:p-5 mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-violet-100 rounded-2xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 md:w-7 md:h-7 text-violet-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900">{supervisee?.full_name ?? "..."}</h1>
              <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
                {supervisee?.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3.5 h-3.5" />{supervisee.phone}</span>}
                {supervisee?.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3.5 h-3.5" />{supervisee.email}</span>}
              </div>
              {supervisee?.notes && <p className="text-sm text-gray-400 mt-1">{supervisee.notes}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-2.5 py-1.5 rounded-xl">
              <ClipboardList className="w-4 h-4" />
              <span className="font-semibold text-sm">{sessions.length}</span>
              <span className="text-xs">מפגשים</span>
            </div>
            <button onClick={() => setShowEdit(true)} className="btn-secondary flex items-center gap-1.5 py-1.5 px-2.5 md:px-3 text-sm">
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">עריכה</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">מפגשי הדרכה ({sessions.length})</h2>
          <button onClick={() => setShowSessionForm(true)} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />
            מפגש חדש
          </button>
        </div>

        {sessionsLoading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">אין מפגשים מתועדים</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                expanded={expandedId === s.id}
                superviseeId={superviseeId}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                onEdit={() => { setEditSession(s); }}
                onRefetch={refetchSessions}
              />
            ))}
          </div>
        )}
      </div>

      {showEdit && supervisee && (
        <SuperviseeFormModal
          supervisee={supervisee}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); }}
        />
      )}

      {(showSessionForm || editSession) && (
        <SupervisionSessionModal
          superviseeId={superviseeId}
          session={editSession ?? undefined}
          onClose={() => { setShowSessionForm(false); setEditSession(null); }}
          onSaved={() => { setShowSessionForm(false); setEditSession(null); refetchSessions(); }}
        />
      )}
    </div>
  );
}

// ── Session row (expandable) ──────────────────
function SessionRow({ session, expanded, superviseeId, onToggle, onEdit }: {
  session: SupervisionSession;
  expanded: boolean;
  superviseeId: string;
  onToggle: () => void;
  onEdit: () => void;
  onRefetch: () => void;
}) {
  const { files, refetch: refetchFiles } = useSupervisionSession(expanded ? session.id : undefined);
  const goals = parseGoals(session.goals);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const mime = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");
    const storagePath = `${superviseeId}/${session.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.SUPERVISEE_FILES).upload(storagePath, file, { contentType: mime });
    if (!error) {
      await supabase.from("supervision_files").insert({ session_id: session.id, supervisee_id: superviseeId, file_name: file.name, storage_path: storagePath, mime_type: mime, file_size: file.size });
      refetchFiles();
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
          <ClipboardList className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{formatDate(session.session_date)}</p>
          {session.summary && <p className="text-xs text-gray-500 truncate">{session.summary}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {session.duration_min && <span>{session.duration_min} דק׳</span>}
          {goals.length > 0 && <span className="bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">{goals.length} מטרות</span>}
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-gray-400 hover:text-gray-600 p-1">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <ChevronLeft className={`w-4 h-4 transition-transform ${expanded ? "-rotate-90" : ""}`} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          {goals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-violet-500" /> מטרות הדרכה
              </p>
              <ul className="space-y-1.5">
                {goals.map((g) => (
                  <li key={g.id} className="flex items-center gap-2">
                    {g.done ? <CheckSquare className="w-4 h-4 text-violet-500 shrink-0" /> : <Square className="w-4 h-4 text-gray-300 shrink-0" />}
                    <span className={`text-sm ${g.done ? "line-through text-gray-400" : "text-gray-700"}`}>{g.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {session.summary && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">סיכום</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.summary}</p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">קבצים ({files.length})</p>
              <label className={`flex items-center gap-1 text-xs text-violet-600 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="w-3 h-3" />
                {uploading ? "מעלה..." : "העלאה"}
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
              </label>
            </div>
            {files.length > 0
              ? <div className="space-y-1">{files.map((f) => <FileItem key={f.id} file={f as any} bucket="SUPERVISEE_FILES" onDeleted={refetchFiles} />)}</div>
              : <p className="text-xs text-gray-400">אין קבצים</p>
            }
          </div>
        </div>
      )}
    </div>
  );
}
