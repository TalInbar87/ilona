/**
 * Israeli Ministry of Education school-year holidays (חופשות משרד החינוך).
 * Covers תשפ"ה (2024-2025) and תשפ"ו (2025-2026).
 * Each entry is rendered as a FullCalendar background event.
 *
 * `end` is exclusive (FullCalendar convention) — the last visible day is end - 1 day.
 */

export interface HolidayEvent {
  id: string;
  title: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD (exclusive)
  display: "background";
  backgroundColor: string;
  classNames: string[];
  extendedProps: { isHoliday: true; holidayTitle: string };
}

const BG = "#fef9c3"; // soft yellow — gentle on the eye, won't compete with appointments

function h(
  id: string,
  title: string,
  start: string,
  end: string
): HolidayEvent {
  return {
    id,
    title,
    start,
    end,
    display: "background",
    backgroundColor: BG,
    classNames: ["holiday-bg"],
    extendedProps: { isHoliday: true, holidayTitle: title },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// תשפ"ה  2024 – 2025
// ────────────────────────────────────────────────────────────────────────────
const HOLIDAYS_5785: HolidayEvent[] = [
  // ראש השנה  2–4 Oct 2024
  h("5785-rh",    "🍎 ראש השנה",     "2024-10-02", "2024-10-05"),
  // יום כיפור  11–12 Oct 2024
  h("5785-yk",    "🕍 יום כיפור",     "2024-10-11", "2024-10-13"),
  // סוכות + שמחת תורה  16–25 Oct 2024
  h("5785-suk",   "🌿 סוכות",         "2024-10-16", "2024-10-26"),
  // חנוכה  25 Dec 2024 – 2 Jan 2025
  h("5785-chan",  "🕎 חנוכה",         "2024-12-25", "2025-01-03"),
  // פורים  13–14 Mar 2025
  h("5785-pur",   "🎭 פורים",         "2025-03-13", "2025-03-15"),
  // פסח  13–25 Apr 2025
  h("5785-pss",   "🫓 פסח",           "2025-04-13", "2025-04-26"),
  // יום העצמאות  30 Apr 2025
  h("5785-ind",   "🇮🇱 יום העצמאות", "2025-04-30", "2025-05-01"),
  // שבועות  1–3 Jun 2025
  h("5785-shv",   "📜 שבועות",        "2025-06-01", "2025-06-04"),
];

// ────────────────────────────────────────────────────────────────────────────
// תשפ"ו  2025 – 2026
// ────────────────────────────────────────────────────────────────────────────
const HOLIDAYS_5786: HolidayEvent[] = [
  // ראש השנה  22–24 Sep 2025
  h("5786-rh",    "🍎 ראש השנה",     "2025-09-22", "2025-09-25"),
  // יום כיפור  1–2 Oct 2025
  h("5786-yk",    "🕍 יום כיפור",     "2025-10-01", "2025-10-03"),
  // סוכות + שמחת תורה  6–14 Oct 2025
  h("5786-suk",   "🌿 סוכות",         "2025-10-06", "2025-10-15"),
  // חנוכה  14–22 Dec 2025
  h("5786-chan",  "🕎 חנוכה",         "2025-12-14", "2025-12-23"),
  // פורים  2–3 Mar 2026
  h("5786-pur",   "🎭 פורים",         "2026-03-02", "2026-03-04"),
  // פסח  30 Mar – 8 Apr 2026
  h("5786-pss",   "🫓 פסח",           "2026-03-30", "2026-04-09"),
  // יום העצמאות  29 Apr 2026
  h("5786-ind",   "🇮🇱 יום העצמאות", "2026-04-29", "2026-04-30"),
  // שבועות  20–22 May 2026
  h("5786-shv",   "📜 שבועות",        "2026-05-20", "2026-05-23"),
];

export const ISRAELI_HOLIDAYS: HolidayEvent[] = [
  ...HOLIDAYS_5785,
  ...HOLIDAYS_5786,
];
