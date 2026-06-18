import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Activity, Clock, Stethoscope, Users2, GraduationCap, CheckSquare } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import { formatDate } from "../lib/utils";
import type { AppointmentWithPatient } from "../hooks/useAppointments";
import type { Appointment, Meeting } from "../types";
import { AppointmentModal } from "../components/calendar/AppointmentModal";
import { MeetingModal } from "../components/calendar/MeetingModal";
import { CalendarView } from "../components/calendar/CalendarView";
import { TodoList } from "../components/todos/TodoList";

// ── Daily schedule helpers ────────────────────────────────────────────────────
type TodaySupervision = {
  id: string;
  session_date: string;
  session_time: string | null;
  duration_min: number | null;
  supervisees: { full_name: string } | null;
};

type DayItem =
  | { kind: "appointment"; time: string; data: AppointmentWithPatient }
  | { kind: "meeting"; time: string; data: Meeting }
  | { kind: "supervision"; time: string; data: TodaySupervision };

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const firstName = useAuthStore((s) => s.firstName);
  const [stats, setStats] = useState({ patients: 0, monthlyTreatments: 0, monthlySupervisionsCount: 0 });
  const [todayItems, setTodayItems] = useState<DayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayLoading, setTodayLoading] = useState(true);

  // Edit modals (for today's schedule)
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [editMeeting, setEditMeeting]         = useState<Meeting | null>(null);

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split("T")[0];

    const fetchAll = async () => {
      const [{ count: pCount }, { count: tMonthCount }, { count: sMonthCount }] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }).is("archived_at", null),
        supabase
          .from("treatments")
          .select("*", { count: "exact", head: true })
          .gte("session_date", monthStart)
          .lte("session_date", monthEnd),
        supabase
          .from("supervision_sessions")
          .select("*", { count: "exact", head: true })
          .gte("session_date", monthStart)
          .lte("session_date", monthEnd),
      ]);

      setStats({
        patients: pCount ?? 0,
        monthlyTreatments: tMonthCount ?? 0,
        monthlySupervisionsCount: sMonthCount ?? 0,
      });
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Today's schedule (appointments + meetings + supervision sessions)
  const fetchToday = useCallback(async () => {
    const { start, end } = todayRange();
    // Use local date (not UTC) to avoid midnight timezone mismatch
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [{ data: appts }, { data: meets }, { data: sups, error: supError }] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, patients(full_name)")
        .in("status", ["scheduled", "completed"])
        .gte("start_time", start)
        .lte("start_time", end)
        .order("start_time"),
      supabase
        .from("meetings")
        .select("*")
        .gte("start_time", start)
        .lte("start_time", end)
        .order("start_time"),
      supabase
        .from("supervision_sessions")
        .select("id, session_date, session_time, duration_min, supervisees!supervisee_id(full_name)")
        .eq("session_date", todayDate)
        .order("session_time"),
    ]);

    if (supError) console.error("[fetchToday] supervision_sessions error:", supError);
    console.log("[fetchToday] date:", todayDate, "sups:", sups);

    const items: DayItem[] = [
      ...((appts ?? []) as AppointmentWithPatient[]).map((a) => ({
        kind: "appointment" as const,
        time: a.start_time,
        data: a,
      })),
      ...((meets ?? []) as Meeting[]).map((m) => ({
        kind: "meeting" as const,
        time: m.start_time,
        data: m,
      })),
      ...((sups ?? []) as TodaySupervision[]).map((s) => ({
        kind: "supervision" as const,
        // Build a sortable ISO string from date + time
        time: `${s.session_date}T${s.session_time ?? "00:00"}`,
        data: s,
      })),
    ];
    items.sort((a, b) => a.time.localeCompare(b.time));
    setTodayItems(items);
    setTodayLoading(false);
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const todayLabel = formatDate(new Date().toISOString());
  const monthName = new Date().toLocaleString("he-IL", { month: "long" });

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5 md:mb-6">
        {firstName ? `שלום, ${firstName}!` : "שלום!"}
      </h1>

      {/* Stats — top */}
      <div className={`grid gap-3 mb-6 ${!loading && stats.monthlySupervisionsCount > 0 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}>
        <StatCard
          icon={<Users className="w-5 h-5 md:w-6 md:h-6 text-sky-600" />}
          bg="bg-sky-50"
          label="מטופלים פעילים"
          value={loading ? "—" : stats.patients.toString()}
          onClick={() => navigate("/patients")}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />}
          bg="bg-emerald-50"
          label={`טיפולים — ${monthName}`}
          value={loading ? "—" : stats.monthlyTreatments.toString()}
        />
        {!loading && stats.monthlySupervisionsCount > 0 && (
          <StatCard
            icon={<GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-violet-600" />}
            bg="bg-violet-50"
            label={`הדרכות — ${monthName}`}
            value={stats.monthlySupervisionsCount.toString()}
            onClick={() => navigate("/supervisees")}
            className="col-span-2 md:col-span-1"
          />
        )}
      </div>

      {/* Daily planning + Todos — side by side */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">

        {/* Today's schedule — 50% */}
        <div className="card p-5 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              תכנון יומי — {todayLabel}
            </h2>
            <button
              onClick={() => navigate("/calendar")}
              className="text-xs text-sky-600 hover:text-sky-700"
            >
              לוח שנה מלא ←
            </button>
          </div>

          {todayLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : todayItems.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">אין טיפולים או פגישות מתוכננים להיום</p>
            </div>
          ) : (
            <div className="space-y-2 md:max-h-72 md:overflow-y-auto">
              {todayItems.map((item) =>
                item.kind === "appointment" ? (
                  <div
                    key={`appt-${item.data.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-sky-50 cursor-pointer transition-colors group"
                    onClick={() => setEditAppointment(item.data)}
                  >
                    <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
                      <Stethoscope className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {(item.data as AppointmentWithPatient).patients?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.data.start_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(item.data.end_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {item.data.status === "completed" ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 shrink-0">בוצע</span>
                    ) : (
                      <span className="text-xs text-gray-300 group-hover:text-sky-400 transition-colors shrink-0">עריכה</span>
                    )}
                  </div>
                ) : item.kind === "meeting" ? (
                  <div
                    key={`meet-${item.data.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-50 cursor-pointer transition-colors group"
                    onClick={() => setEditMeeting(item.data)}
                  >
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                      <Users2 className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.data.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.data.start_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(item.data.end_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-xs text-gray-300 group-hover:text-violet-400 transition-colors shrink-0">עריכה</span>
                  </div>
                ) : (
                  // supervision
                  <div
                    key={`sup-${item.data.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/50 cursor-default"
                  >
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {item.data.supervisees?.full_name ?? "הדרכה"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.data.session_time
                          ? item.data.session_time.slice(0, 5)
                          : "—"}
                        {item.data.duration_min
                          ? ` – ${new Date(
                              new Date(`${item.data.session_date}T${item.data.session_time ?? "00:00"}`).getTime() +
                                item.data.duration_min * 60000
                            ).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 shrink-0">הדרכה</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Todos widget — 50% */}
        <div className="card p-5 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-sky-600" />
              משימות
            </h2>
            <button
              onClick={() => navigate("/todos")}
              className="text-xs text-sky-600 hover:text-sky-700"
            >
              כל המשימות ←
            </button>
          </div>
          <TodoList compact />
        </div>

      </div>

      {/* Edit modals for today's items */}
      {editAppointment && (
        <AppointmentModal
          appointment={editAppointment}
          onClose={() => setEditAppointment(null)}
          onSaved={() => { setEditAppointment(null); fetchToday(); }}
          onCompleted={(patientId, prefill) => {
            setEditAppointment(null);
            fetchToday();
            navigate(`/patients/${patientId}`, { state: { openNewTreatment: true, prefill } });
          }}
        />
      )}
      {editMeeting && (
        <MeetingModal
          meeting={editMeeting}
          onClose={() => setEditMeeting(null)}
          onSaved={() => { setEditMeeting(null); fetchToday(); }}
        />
      )}

      {/* Calendar */}
      <CalendarView height="600px" />
    </div>
  );
}

function StatCard({ icon, bg, label, value, onClick, className }: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`card p-3 md:p-5 flex items-center gap-3 md:gap-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${className ?? ""}`}
      onClick={onClick}
    >
      <div className={`w-10 h-10 md:w-12 md:h-12 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs md:text-sm text-gray-500 truncate">{label}</p>
      </div>
    </div>
  );
}
