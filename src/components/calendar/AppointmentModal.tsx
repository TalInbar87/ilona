import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Appointment, AppointmentStatus } from "../../types";

interface Props {
  initialStart?: Date;
  initialEnd?: Date;
  appointment?: Appointment;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AppointmentModal({ initialStart, initialEnd, appointment, onClose, onSaved }: Props) {
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    patient_id: appointment?.patient_id ?? "",
    start_time: appointment?.start_time
      ? toLocalDatetimeValue(new Date(appointment.start_time))
      : initialStart ? toLocalDatetimeValue(initialStart) : "",
    end_time: appointment?.end_time
      ? toLocalDatetimeValue(new Date(appointment.end_time))
      : initialEnd ? toLocalDatetimeValue(initialEnd) : "",
    notes: appointment?.notes ?? "",
    status: (appointment?.status ?? "scheduled") as AppointmentStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("patients")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => setPatients(data ?? []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || !form.start_time || !form.end_time) {
      setError("נא למלא את כל השדות החובה");
      return;
    }
    setSaving(true);

    const payload = {
      patient_id: form.patient_id,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      notes: form.notes.trim() || null,
      status: form.status,
    };

    const { error: err } = appointment
      ? await supabase.from("appointments").update(payload).eq("id", appointment.id)
      : await supabase.from("appointments").insert(payload);

    if (err) setError(err.message);
    else onSaved();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!appointment || !confirm("למחוק את התור?")) return;
    await supabase.from("appointments").delete().eq("id", appointment.id);
    onSaved();
  };

  const statusLabels: Record<AppointmentStatus, string> = {
    scheduled: "מתוכנן",
    completed: "בוצע",
    cancelled: "בוטל",
    no_show: "לא הגיע",
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {appointment ? "עריכת תור" : "תור חדש"}
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
            <label className="label-base">מטופל *</label>
            <select
              value={form.patient_id}
              onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              className="input-base"
              required
            >
              <option value="">בחר מטופל...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          {appointment && (
            <div>
              <label className="label-base">סטטוס</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}
                className="input-base"
              >
                {Object.entries(statusLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label-base">הערות</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-base resize-none"
              rows={2}
              placeholder="הערות לגבי התור..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "שומר..." : "שמירה"}
            </button>
            {appointment && (
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
