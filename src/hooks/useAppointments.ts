import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Appointment } from "../types";

export interface AppointmentWithPatient extends Appointment {
  patients: { full_name: string } | null;
}

export function useAppointments(startDate?: string, endDate?: string) {
  const [data, setData] = useState<AppointmentWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select("*, patients(full_name)")
      .order("start_time");

    if (startDate) query = query.gte("start_time", startDate);
    if (endDate) query = query.lte("start_time", endDate);

    const { data: rows, error: err } = await query;
    if (err) setError(err.message);
    else setData((rows as AppointmentWithPatient[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [startDate, endDate]);

  return { data, loading, error, refetch };
}
