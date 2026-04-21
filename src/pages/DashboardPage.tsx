import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Activity, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatDateTime } from "../lib/utils";
import type { AppointmentWithPatient } from "../hooks/useAppointments";

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ patients: 0, treatments: 0 });
  const [upcoming, setUpcoming] = useState<AppointmentWithPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const now = new Date().toISOString();
      const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5 md:mb-6">שלום!</h1>

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
            <p className="text-sm">אין תורים קרובים השבוע</p>
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
