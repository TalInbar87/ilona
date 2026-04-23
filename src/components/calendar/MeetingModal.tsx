import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Meeting } from "../../types";

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface Props {
  initialStart?: Date;
  initialEnd?: Date;
  meeting?: Meeting;
  onClose: () => void;
  onSaved: () => void;
}

export function MeetingModal({ initialStart, initialEnd, meeting, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: meeting?.title ?? "",
    start_time: meeting?.start_time
      ? toLocalDatetimeValue(new Date(meeting.start_time))
      : initialStart ? toLocalDatetimeValue(initialStart) : "",
    end_time: meeting?.end_time
      ? toLocalDatetimeValue(new Date(meeting.end_time))
      : initialEnd ? toLocalDatetimeValue(initialEnd) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.start_time || !form.end_time) {
      setError("נא למלא כותרת ושעות");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
    };
    const { error: err } = meeting
      ? await supabase.from("meetings").update(payload).eq("id", meeting.id)
      : await supabase.from("meetings").insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    onSaved();
  };

  const handleDelete = async () => {
    if (!meeting || !confirm("למחוק את הפגישה?")) return;
    await supabase.from("meetings").delete().eq("id", meeting.id);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {meeting ? "עריכת פגישה" : "פגישה חדשה"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="label-base">כותרת *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-base"
              placeholder="פגישת צוות, הדרכה, ..."
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">התחלה *</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="input-base text-sm"
                required
              />
            </div>
            <div>
              <label className="label-base">סיום *</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="input-base text-sm"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "שומר..." : "שמירה"}
            </button>
            {meeting && (
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
