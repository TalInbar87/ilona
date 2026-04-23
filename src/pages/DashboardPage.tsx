import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Activity, Clock, Stethoscope, Users2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDateTime, formatDate } from "../lib/utils";
import type { AppointmentWithPatient } from "../hooks/useAppointments";
import type { Appointment, Meeting } from "../types";
import { AppointmentModal } from "../components/calendar/AppointmentModal";
import { MeetingModal } from "../components/calendar/MeetingModal";

// ── Daily schedule helpers ────────────────────────────────────────────────────
type DayItem =
  | { kind: "appointment"; time: string; data: AppointmentWithPatient }
  | { kind: "meeting"; time: string; data: Meeting };

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ patients: 0, treatments: 0 });
  const [upcoming, setUpcoming] = useState<AppointmentWithPatient[]>([]);
  const [todayItems, setTodayItems] = useState<DayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayLoading, setTodayLoading] = useState(true);

  // Edit modals
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      // Start from tomorrow 00:00 so there's no overlap with "תכנון יומי"
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const now = tomorrow.toISOString();
      const weekEnd = new Date(tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ count: pCount }, { count: tCount }, { data: appts }] =
        await Promise.all([
          supabase.from("patients").select("*", { count: "exact", head: true }),
          supabase.from("treatments").select("*", { count: "exact", head: true }),
          supabase
            .from("appointments")
            .select("*, patients(full_name)")
            .eq("status", "scheduled")
            .gte("start_time", now)
            .lte("start_time", weekEnd)
            .order("start_time")
            .limit(5),
        ]);

      setStats({ patients: pCount ?? 0, treatments: tCount ?? 0 });
      setUpcoming((appts as AppointmentWithPatient[]) ?? []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Today's schedule (appointments + meetings)
  const fetchToday = useCallback(async () => {
    const { start, end } = todayRange();
    const [{ data: appts }, { data: meets }] = await Promise.all([
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
    ]);

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
    ];
    items.sort((a, b) => a.time.localeCompare(b.time));
    setTodayItems(items);
    setTodayLoading(false);
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const todayLabel = formatDate(new Date().toISOString());

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5 md:mb-6">שלום!</h1>

      {/* Daily planning */}
      <div className="card p-5 mb-6">
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
          <div className="space-y-2">
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
              ) : (
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
              )
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-sky-600" />}
          bg="bg-sky-50"
          label="מטופלים"
          value={loading ? "—" : stats.patients.toString()}
          onClick={() => navigate("/patients")}
        />
        <StatCard
          icon={<Activity className="w-6 h-6 text-emerald-600" />}
          bg="bg-emerald-50"
          label="טיפולים בוצעו"
          value={loading ? "—" : stats.treatments.toString()}
        />
      </div>

      {/* Edit modals */}
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

      {/* Upcoming appointments */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            תורים קרובים
          </h2>
          <button
            onClick={() => navigate("/calendar")}
            className="text-xs text-sky-600 hover:text-sky-700"
          >
            לוח שנה מלא ←
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">אין תורים קרובים בשבעת הימים הבאים</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/patients/${a.patient_id}`)}
              >
                <div className="w-2 h-2 bg-sky-500 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {a.patients?.full_name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(a.start_time)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, bg, label, value, onClick }: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card p-5 flex items-center gap-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}
