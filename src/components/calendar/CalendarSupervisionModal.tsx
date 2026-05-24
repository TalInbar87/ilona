import { useState, useEffect } from "react";
import { X, Link } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useSupervisees } from "../../hooks/useSupervisees";
import { YesNoToggle } from "../common/YesNoToggle";
import type { CalendarSupervisionSession } from "../../hooks/useCalendarSupervisionSessions";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
function toTimeStr(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

interface Props {
  initialStart?: Date;
  initialEnd?: Date;
  session?: CalendarSupervisionSession;
  requiresPayment?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CalendarSupervisionModal({ initialStart, initialEnd, session, requiresPayment = false, onClose, onSaved }: Props) {
  const { data: supervisees, loading: superviseesLoading } = useSupervisees();

  const durationFromSlot =
    initialStart && initialEnd
      ? Math.round((initialEnd.getTime() - initialStart.getTime()) / 60000)
      : null;

  const [form, setForm] = useState({
    supervisee_id: session?.supervisee_id ?? "",
    session_date: session?.session_date ?? (initialStart ? toDateStr(initialStart) : new Date().toISOString().split("T")[0]),
    session_time: session?.session_time ?? (initialStart ? toTimeStr(initialStart) : ""),
    duration_min: session?.duration_min?.toString() ?? durationFromSlot?.toString() ?? "",
    summary: session?.summary ?? "",
    meeting_url: session?.meeting_url ?? "",
  });
  const [paymentReceived, setPaymentReceived] = useState<boolean | null>(session?.payment_received ?? null);
  const [invoiceIssued, setInvoiceIssued]     = useState<boolean | null>(session?.invoice_issued ?? null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select first supervisee if creating new and none selected
  useEffect(() => {
    if (!session && !form.supervisee_id && supervisees.length > 0) {
      setForm((f) => ({ ...f, supervisee_id: supervisees[0].id }));
    }
  }, [supervisees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supervisee_id) { setError("נא לבחור מודרכת"); return; }
    setSaving(true);
    const basePayload = {
      session_date: form.session_date,
      session_time: form.session_time || null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      summary: form.summary.trim() || null,
      meeting_url: form.meeting_url.trim() || null,
      ...(requiresPayment ? { payment_received: paymentReceived, invoice_issued: invoiceIssued } : {}),
    };
    if (session) {
      await supabase.from("supervision_sessions").update(basePayload).eq("id", session.id);
    } else {
      await supabase.from("supervision_sessions").insert({ ...basePayload, supervisee_id: form.supervisee_id });
    }
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!session || !confirm("למחוק את מפגש ההדרכה?")) return;
    await supabase.from("supervision_sessions").delete().eq("id", session.id);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {session ? "עריכת הדרכה" : "מפגש הדרכה חדש"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Supervisee picker */}
          <div>
            <label className="label-base">מודרכת *</label>
            {superviseesLoading ? (
              <div className="input-base bg-gray-50 text-gray-400 text-sm">טוען...</div>
            ) : supervisees.length === 0 ? (
              <div className="input-base bg-gray-50 text-gray-400 text-sm">אין מודרכות</div>
            ) : (
              <select
                value={form.supervisee_id}
                onChange={(e) => setForm({ ...form, supervisee_id: e.target.value })}
                className="input-base"
                required
              >
                <option value="">בחרי מודרכת...</option>
                {supervisees.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date / Time */}
          <div className="grid grid-cols-2 gap-3">
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
            <label className="label-base">משך (דקות)</label>
            <input
              type="number"
              value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
              className="input-base"
              placeholder="60"
              min="1"
              max="480"
            />
          </div>

          {/* Meeting URL */}
          <div>
            <label className="label-base flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-gray-400" />
              קישור לפגישה אונליין
            </label>
            <input
              type="url"
              value={form.meeting_url}
              onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
              className="input-base"
              placeholder="https://zoom.us/j/..."
              dir="ltr"
            />
            {session?.meeting_url && (
              <a href={session.meeting_url} target="_blank" rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-xs text-sky-600 hover:underline">
                <Link className="w-3 h-3" />הצטרפות לפגישה
              </a>
            )}
          </div>

          {/* Payment */}
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

          {/* Summary */}
          <div>
            <label className="label-base">סיכום / הערות</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="input-base resize-none"
              rows={3}
              placeholder="רשימות מהמפגש..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "שומר..." : "שמירה"}
            </button>
            {session && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
              >
                מחיקה
              </button>
            )}
            <button type="button" onClick={onClose} className="btn-secondary px-4">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
