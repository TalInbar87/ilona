import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import heLocale from "@fullcalendar/core/locales/he";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { Plus, X, Stethoscope, Users } from "lucide-react";
import { useAppointments } from "../hooks/useAppointments";
import { useMeetings } from "../hooks/useMeetings";
import { AppointmentModal } from "../components/calendar/AppointmentModal";
import { MeetingModal } from "../components/calendar/MeetingModal";
import { ISRAELI_HOLIDAYS } from "../lib/israeliHolidays";
import type { Appointment, Meeting } from "../types";

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

const MEETING_COLOR = "#8b5cf6"; // violet

type SlotInfo = { start: Date; end: Date };

/** Shown when clicking a blank time slot — lets user choose type */
function EventTypePicker({
  onPickAppointment,
  onPickMeeting,
  onClose,
}: {
  slot?: SlotInfo;
  onPickAppointment: () => void;
  onPickMeeting: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">מה להוסיף?</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="space-y-3">
          <button
            onClick={onPickAppointment}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-sky-100 hover:border-sky-400 hover:bg-sky-50 transition-colors text-right"
          >
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">טיפול</p>
              <p className="text-xs text-gray-500">תור עם מטופל</p>
            </div>
          </button>
          <button
            onClick={onPickMeeting}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-violet-100 hover:border-violet-400 hover:bg-violet-50 transition-colors text-right"
          >
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">פגישה</p>
              <p className="text-xs text-gray-500">אירוע כללי בלוח השנה</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

export function CalendarPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const { data: appointments, refetch: refetchAppts } = useAppointments(range?.start, range?.end);
  const { data: meetings, refetch: refetchMeetings } = useMeetings(range?.start, range?.end);

  const [pickerSlot, setPickerSlot] = useState<SlotInfo | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [meetingSlot, setMeetingSlot] = useState<SlotInfo | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const calendarRef = useRef<FullCalendar>(null);

  const refetchAll = () => { refetchAppts(); refetchMeetings(); };

  // ── Events ────────────────────────────────────────────────────────────────
  const appointmentEvents: EventInput[] = appointments.map((a) => ({
    id: `appt-${a.id}`,
    title: (a as any).patients?.full_name ?? "מטופל",
    start: a.start_time,
    end: a.end_time,
    backgroundColor: STATUS_COLORS[a.status] ?? STATUS_COLORS.scheduled,
    borderColor: "transparent",
    extendedProps: { type: "appointment", appointment: a },
  }));

  const meetingEvents: EventInput[] = meetings.map((m) => ({
    id: `meet-${m.id}`,
    title: m.title,
    start: m.start_time,
    end: m.end_time,
    backgroundColor: MEETING_COLOR,
    borderColor: "transparent",
    extendedProps: { type: "meeting", meeting: m },
  }));

  const events: EventInput[] = [...appointmentEvents, ...meetingEvents, ...ISRAELI_HOLIDAYS];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDatesSet = (info: { startStr: string; endStr: string }) => {
    setRange({ start: info.startStr, end: info.endStr });
  };

  /** Desktop drag-select or mobile tap → open type picker */
  const handleSelect = (info: DateSelectArg) => {
    setPickerSlot({ start: info.start, end: info.end });
  };

  const handleEventClick = (info: EventClickArg) => {
    const { type, appointment, meeting } = info.event.extendedProps;
    if (type === "meeting") setSelectedMeeting(meeting as Meeting);
    else setSelectedAppointment(appointment as Appointment);
  };

  /** Mobile "+" button — prefill with "now → now+45min" */
  const handleMobileAdd = () => {
    const start = new Date();
    start.setSeconds(0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    setPickerSlot({ start, end });
  };

  const closePicker = () => setPickerSlot(null);

  const pickAppointment = () => {
    if (!pickerSlot) return;
    setSelectedSlot(pickerSlot);
    setPickerSlot(null);
  };

  const pickMeeting = () => {
    if (!pickerSlot) return;
    setMeetingSlot(pickerSlot);
    setPickerSlot(null);
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
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MEETING_COLOR }} />
            פגישה
          </span>
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
              ? { start: "prev,next", center: "title", end: "today" }
              : { start: "prev,next today", center: "title", end: "dayGridMonth,timeGridWeek,timeGridDay" }
          }
          footerToolbar={
            isMobile
              ? { center: "dayGridMonth,timeGridWeek,timeGridDay" }
              : undefined
          }
          buttonText={{ today: "היום", month: "חודש", week: "שבוע", day: "יום" }}
          selectable
          selectMirror
          longPressDelay={200}
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

      {/* Mobile floating "+" button */}
      <button
        onClick={handleMobileAdd}
        className="md:hidden fixed bottom-6 left-6 w-14 h-14 bg-sky-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
        aria-label="הוסף אירוע"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Type picker */}
      {pickerSlot && (
        <EventTypePicker
          onPickAppointment={pickAppointment}
          onPickMeeting={pickMeeting}
          onClose={closePicker}
        />
      )}

      {/* Appointment modal */}
      {(selectedSlot || selectedAppointment) && (
        <AppointmentModal
          initialStart={selectedSlot?.start}
          initialEnd={selectedSlot?.end}
          appointment={selectedAppointment ?? undefined}
          onClose={() => { setSelectedSlot(null); setSelectedAppointment(null); }}
          onSaved={() => { setSelectedSlot(null); setSelectedAppointment(null); refetchAll(); }}
          onCompleted={(patientId, prefill) => {
            setSelectedSlot(null);
            setSelectedAppointment(null);
            refetchAll();
            navigate(`/patients/${patientId}`, {
              state: { openNewTreatment: true, prefill },
            });
          }}
        />
      )}

      {/* Meeting modal */}
      {(meetingSlot || selectedMeeting) && (
        <MeetingModal
          initialStart={meetingSlot?.start}
          initialEnd={meetingSlot?.end}
          meeting={selectedMeeting ?? undefined}
          onClose={() => { setMeetingSlot(null); setSelectedMeeting(null); }}
          onSaved={() => { setMeetingSlot(null); setSelectedMeeting(null); refetchAll(); }}
        />
      )}
    </div>
  );
}
