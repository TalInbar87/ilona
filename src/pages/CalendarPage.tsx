import { CalendarView } from "../components/calendar/CalendarView";

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

const MEETING_COLOR = "#8b5cf6";

export function CalendarPage() {
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

      <CalendarView />
    </div>
  );
}
