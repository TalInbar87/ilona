import { useState, useEffect } from "react";
import { X, Mail, AlertTriangle, ChevronRight, Repeat } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ISRAELI_HOLIDAYS } from "../../lib/israeliHolidays";
import type { Appointment, AppointmentStatus } from "../../types";

// ── Helpers ────────────────────────────────────────────────────────────────────

interface TreatmentPrefill {
  session_date: string;
  session_time: string;
  duration_min: number;
}

interface PatientOption {
  id: string;
  full_name: string;
  email: string | null;
}

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildMailtoHref(patient: PatientOption, startStr: string, endStr: string): string {
  if (!patient.email || !startStr) return "";
  const start = new Date(startStr);
  const end = new Date(endStr);
  const dateStr = start.toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = `${start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
  const subject = encodeURIComponent(`זימון לפגישה – ${dateStr}`);
  const body = encodeURIComponent(`שלום ${patient.full_name},\n\nאני מזמינה אותך לפגישה:\nתאריך: ${dateStr}\nשעה: ${timeStr}\n\nבברכה`);
  return `mailto:${patient.email}?subject=${subject}&body=${body}`;
}

function getHolidayName(dateStr: string): string | null {
  for (const h of ISRAELI_HOLIDAYS) {
    if (dateStr >= h.start && dateStr < h.end) return h.extendedProps.holidayTitle;
  }
  return null;
}

function generateWeeklyDates(startDate: Date, weeks: number): Date[] {
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(startDate.getTime());
    d.setDate(d.getDate() + i * 7);
    return d;
  });
}

function formatDateHe(date: Date): string {
  return date.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" });
}

function formatTimeHe(date: Date): string {
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

// ── Conflict types ─────────────────────────────────────────────────────────────

interface ConflictInfo {
  date: Date;
  dateStr: string;
  descriptions: string[];
}

// ── Phase machine ──────────────────────────────────────────────────────────────

type Phase = "form" | "checking" | "conflict" | "confirm";

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  initialStart?: Date;
  initialEnd?: Date;
  appointment?: Appointment;
  onClose: () => void;
  onSaved: () => void;
  onCompleted?: (patientId: string, prefill: TreatmentPrefill) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AppointmentModal({ initialStart, initialEnd, appointment, onClose, onSaved, onCompleted }: Props) {
  const isEdit = !!appointment;

  const [patients, setPatients] = useState<PatientOption[]>([]);
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
  const [weeks, setWeeks] = useState(1);

  // Phase machine
  const [phase, setPhase] = useState<Phase>("form");
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [finalDates, setFinalDates] = useState<Date[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("patients")
      .select("id, full_name, email")
      .order("full_name")
      .then(({ data }) => setPatients((data ?? []) as PatientOption[]));
  }, []);

  const selectedPatient = patients.find((p) => p.id === form.patient_id) ?? null;
  const mailtoHref = selectedPatient?.email && form.start_time && form.end_time
    ? buildMailtoHref(selectedPatient, form.start_time, form.end_time)
    : "";

  // ── Single-appointment save (edit mode or weeks=1) ─────────────────────────

  const saveSingle = async () => {
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

    if (err) { setError(err.message); setSaving(false); return; }

    if (form.status === "completed" && onCompleted && form.patient_id) {
      const start = new Date(form.start_time);
      const end = new Date(form.end_time);
      const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
      const session_date = start.toISOString().split("T")[0];
      const pad = (n: number) => String(n).padStart(2, "0");
      const session_time = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
      onCompleted(form.patient_id, { session_date, session_time, duration_min: durationMin });
    } else {
      onSaved();
    }
    setSaving(false);
  };

  // ── Form submit → either save direct or start conflict-check phase ─────────

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.patient_id || !form.start_time || !form.end_time) {
      setError("נא למלא את כל השדות החובה");
      return;
    }
    if (isEdit || weeks === 1) {
      await saveSingle();
      return;
    }

    // Multi-week: check conflicts
    setPhase("checking");

    const startDate = new Date(form.start_time);
    const endDate = new Date(form.end_time);
    const durationMs = endDate.getTime() - startDate.getTime();
    const dates = generateWeeklyDates(startDate, weeks);
    const foundConflicts: ConflictInfo[] = [];

    for (const date of dates) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date.getTime() + durationMs);
      const dateStr = date.toISOString().split("T")[0];
      const descriptions: string[] = [];

      // Holiday
      const holiday = getHolidayName(dateStr);
      if (holiday) descriptions.push(`חג: ${holiday}`);

      // Other appointments
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, patients(full_name)")
        .not("status", "in", '("cancelled","no_show")')
        .lt("start_time", dayEnd.toISOString())
        .gt("end_time", dayStart.toISOString());

      if (appts && appts.length > 0) {
        appts.forEach((a: any) =>
          descriptions.push(`טיפול עם ${a.patients?.full_name ?? "מטופל"}`)
        );
      }

      // Meetings
      const { data: meets } = await supabase
        .from("meetings")
        .select("id, title")
        .lt("start_time", dayEnd.toISOString())
        .gt("end_time", dayStart.toISOString());

      if (meets && meets.length > 0) {
        meets.forEach((m: any) => descriptions.push(`פגישה: ${m.title}`));
      }

      if (descriptions.length > 0) {
        foundConflicts.push({ date, dateStr, descriptions });
      }
    }

    setFinalDates(dates);

    if (foundConflicts.length > 0) {
      setConflicts(foundConflicts);
      setPhase("conflict");
    } else {
      setPhase("confirm");
    }
  };

  // ── Conflict resolution ────────────────────────────────────────────────────

  const handleConflictYes = () => {
    // Keep count: skip conflicting dates, add extra weeks at the end
    const conflictSet = new Set(conflicts.map((c) => c.dateStr));
    const nonConflicting = finalDates.filter((d) => !conflictSet.has(d.toISOString().split("T")[0]));

    const lastDate = finalDates[finalDates.length - 1];
    const extraDates = conflicts.map((_, i) => {
      const d = new Date(lastDate.getTime());
      d.setDate(d.getDate() + (i + 1) * 7);
      return d;
    });

    setFinalDates(
      [...nonConflicting, ...extraDates].sort((a, b) => a.getTime() - b.getTime())
    );
    setPhase("confirm");
  };

  const handleConflictNo = () => {
    // Fewer sessions: just remove conflicting dates
    const conflictSet = new Set(conflicts.map((c) => c.dateStr));
    setFinalDates(finalDates.filter((d) => !conflictSet.has(d.toISOString().split("T")[0])));
    setPhase("confirm");
  };

  // ── Final creation ─────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (finalDates.length === 0) { onSaved(); return; }
    setSaving(true);
    const seriesId = crypto.randomUUID();
    const startDate = new Date(form.start_time);
    const endDate = new Date(form.end_time);
    const durationMs = endDate.getTime() - startDate.getTime();
    const total = finalDates.length;

    const rows = finalDates.map((date, i) => ({
      patient_id: form.patient_id,
      start_time: date.toISOString(),
      end_time: new Date(date.getTime() + durationMs).toISOString(),
      notes: form.notes.trim() || null,
      status: "scheduled" as AppointmentStatus,
      series_id: seriesId,
      series_total: total,
      series_index: i + 1,
    }));

    const { error: err } = await supabase.from("appointments").insert(rows);
    if (err) { setError(err.message); setSaving(false); setPhase("form"); return; }
    setSaving(false);
    onSaved();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

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

  // ── Render: "checking" overlay ─────────────────────────────────────────────

  if (phase === "checking") {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">בודק התנגשויות...</p>
        </div>
      </div>
    );
  }

  // ── Render: conflict dialog ────────────────────────────────────────────────

  if (phase === "conflict") {
    const startDate = new Date(form.start_time);
    const endDate = new Date(form.end_time);
    const durationMs = endDate.getTime() - startDate.getTime();

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              נמצאו התנגשויות
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <ul className="space-y-3">
              {conflicts.map((c) => {
                const dayStart = new Date(c.date);
                const dayEnd = new Date(c.date.getTime() + durationMs);
                return (
                  <li key={c.dateStr} className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                      {formatDateHe(c.date)} · {formatTimeHe(dayStart)}–{formatTimeHe(dayEnd)}
                    </p>
                    <ul className="space-y-0.5">
                      {c.descriptions.map((d, i) => (
                        <li key={i} className="text-xs text-amber-700">• {d}</li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>

            <p className="text-sm font-semibold text-gray-800 text-center">
              האם להוסיף בשבוע אחר?
            </p>
            <p className="text-xs text-gray-500 text-center">
              <strong>כן</strong> — לדלג ולהוסיף שבוע נוסף בסוף (שמירת כמות) ·{" "}
              <strong>לא</strong> — להוסיף {finalDates.length - conflicts.length} תורים בלבד
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConflictYes}
                className="btn-primary flex-1"
              >
                כן — הוסף שבוע אחר
              </button>
              <button
                type="button"
                onClick={handleConflictNo}
                className="btn-secondary flex-1"
              >
                לא — {finalDates.length - conflicts.length} תורים
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPhase("form")}
              className="w-full text-sm text-gray-400 hover:text-gray-600"
            >
              ← חזרה לעריכה
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: confirmation dialog ────────────────────────────────────────────

  if (phase === "confirm") {
    const startDate = new Date(form.start_time);
    const endDate = new Date(form.end_time);
    const durationMs = endDate.getTime() - startDate.getTime();
    const patientName = selectedPatient?.full_name ?? "—";

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-sky-500" />
              אישור יצירת {finalDates.length} תורים
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">
              מטופל: <strong>{patientName}</strong>
            </p>

            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {finalDates.map((date, i) => {
                const dayStart = new Date(date);
                const dayEnd = new Date(date.getTime() + durationMs);
                const isLast = i === finalDates.length - 1;
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg text-sm ${
                      isLast ? "bg-amber-50 border border-amber-200" : "bg-gray-50"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isLast ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                    }`}>
                      {i + 1}
                    </span>
                    <span className={isLast ? "text-amber-900 font-medium" : "text-gray-700"}>
                      {formatDateHe(dayStart)} · {formatTimeHe(dayStart)}–{formatTimeHe(dayEnd)}
                      {isLast && " ⚠️"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || finalDates.length === 0}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {saving ? "יוצר..." : `אשר — ${finalDates.length} תורים`}
              </button>
              <button
                type="button"
                onClick={() => setPhase("form")}
                className="btn-secondary px-4"
              >
                חזרה
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: main form ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "עריכת תור" : "תור חדש"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Series info banner (edit mode) */}
          {isEdit && appointment?.series_id && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sm text-sky-800">
              <Repeat className="w-4 h-4 shrink-0" />
              <span>
                תור {appointment.series_index ?? "?"} מתוך {appointment.series_total ?? "?"} בסדרה חוזרת
              </span>
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Weeks field — new appointments only */}
          {!isEdit && (
            <div>
              <label className="label-base flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-sky-500" />
                מספר שבועות
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={(e) => setWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                  className="input-base w-24 text-sm"
                />
                {weeks > 1 && (
                  <span className="text-xs text-sky-600 font-medium">
                    יוצר {weeks} תורים שבועיים
                  </span>
                )}
              </div>
            </div>
          )}

          {isEdit && (
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

          {/* Email invite */}
          {mailtoHref && (
            <a
              href={mailtoHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-700 rounded-xl px-4 py-2.5 transition-colors w-full shadow-sm"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>שלח זימון למייל — {selectedPatient?.full_name}</span>
            </a>
          )}
          {selectedPatient && !selectedPatient.email && form.patient_id && (
            <p className="text-xs text-gray-400 text-center">אין כתובת מייל למטופל זה</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "שומר..." : weeks > 1 && !isEdit ? `בדוק ${weeks} שבועות` : "שמירה"}
            </button>
            {isEdit && (
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
