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
import { ISRAELI_HOLIDAYS } from "../lib/israeliHolidays";
import type { Appointment } from "../types";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#0ea5e9",
  completed: "#22c55e",
  cancelled: "#ef4444",
  no_show: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "מתוכנן",
  completed: "בוצע",
  cancelled: "בוטל",
  no_show: "לא הגיע",
};

const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

export function CalendarPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const { data: appointments, refetch } = useAppointments(range?.start, range?.end);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const appointmentEvents: EventInput[] = appointments.map((a) => ({
    id: a.id,
    title: (a as any).patients?.full_name ?? "מטופל",
    start: a.start_time,
    end: a.end_time,
    backgroundColor: STATUS_COLORS[a.status] ?? STATUS_COLORS.scheduled,
    borderColor: "transparent",
    extendedProps: { appointment: a },
  }));

  const events: EventInput[] = [...appointmentEvents, ...ISRAELI_HOLIDAYS];

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
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
        <h1 className="text-xl font-bold text-gray-900">לוח שנה</h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              {STATUS_LABELS[status]}
            </span>
          ))}
          <span className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-0.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-yellow-200" />
            חופשות משרד החינוך
          </span>
        </div>
      </div>

      <div className="card p-2 md:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          locale={heLocale}
          direction="rtl"
          headerToolbar={
            isMobile
              ? {
                  start: "prev,next",
                  center: "title",
                  end: "today",
                }
              : {
                  start: "prev,next today",
                  center: "title",
                  end: "dayGridMonth,timeGridWeek,timeGridDay",
                }
          }
          footerToolbar={
            isMobile
              ? { center: "dayGridMonth,timeGridWeek,timeGridDay" }
              : undefined
          }
          buttonText={{ today: "היום", month: "חודש", week: "שבוע", day: "יום" }}
          selectable
          selectMirror
          events={events}
          datesSet={handleDatesSet}
          select={handleSelect}
          eventClick={handleEventClick}
          height={isMobile ? "calc(100dvh - 200px)" : "calc(100vh - 200px)"}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          businessHours={{ daysOfWeek: [0, 1, 2, 3, 4], startTime: "08:00", endTime: "18:00" }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
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
