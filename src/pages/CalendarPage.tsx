import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import heLocale from "@fullcalendar/core/locales/he";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { useAppointments } from "../hooks/useAppointments";
import { AppointmentModal } from "../components/calendar/AppointmentModal";
import type { Appointment } from "../types";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#0ea5e9",
  completed: "#22c55e",
  cancelled: "#ef4444",
  no_show: "#f59e0b",
};

export function CalendarPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const { data: appointments, refetch } = useAppointments(range?.start, range?.end);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const events: EventInput[] = appointments.map((a) => ({
    id: a.id,
    title: (a as any).patients?.full_name ?? "מטופל",
    start: a.start_time,
    end: a.end_time,
    backgroundColor: STATUS_COLORS[a.status] ?? STATUS_COLORS.scheduled,
    borderColor: "transparent",
    extendedProps: { appointment: a },
  }));

  const handleDatesSet = (info: { startStr: string; endStr: string }) => {
    setRange({ start: info.startStr, end: info.endStr });
  };

  const handleSelect = (info: DateSelectArg) => {
    setSelectedSlot({ start: info.start, end: info.end });
  };

  const handleEventClick = (info: EventClickArg) => {
    setSelectedAppointment(info.event.extendedProps.appointment as Appointment);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">לוח שנה</h1>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {status === "scheduled" ? "מתוכנן" : status === "completed" ? "בוצע" : status === "cancelled" ? "בוטל" : "לא הגיע"}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={heLocale}
          direction="rtl"
          headerToolbar={{
            start: "prev,next today",
            center: "title",
            end: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{ today: "היום", month: "חודש", week: "שבוע", day: "יום" }}
          selectable
          selectMirror
          events={events}
          datesSet={handleDatesSet}
          select={handleSelect}
          eventClick={handleEventClick}
          height="calc(100vh - 200px)"
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          businessHours={{ daysOfWeek: [0, 1, 2, 3, 4], startTime: "08:00", endTime: "18:00" }}
        />
      </div>

      {(selectedSlot || selectedAppointment) && (
        <AppointmentModal
          initialStart={selectedSlot?.start}
          initialEnd={selectedSlot?.end}
          appointment={selectedAppointment ?? undefined}
          onClose={() => { setSelectedSlot(null); setSelectedAppointment(null); }}
          onSaved={() => { setSelectedSlot(null); setSelectedAppointment(null); refetch(); }}
          onCompleted={(patientId, prefill) => {
            setSelectedSlot(null);
            setSelectedAppointment(null);
            refetch();
            navigate(`/patients/${patientId}`, {
              state: { openNewTreatment: true, prefill },
            });
          }}
        />
      )}
    </div>
  );
}
