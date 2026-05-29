# Session Memory — Ilona Clinic

סיכום עבודה לפי תאריכים, מהחדש לישן.

---

## 2026-05-29

### דוחות — טאב חדש בדף מטופל

**פיצ'ר חדש — "דוחות" בדף מטופל:**

נוצרו 3 קבצים / עודכנו:

1. **`src/lib/generateReport.ts`** (חדש)
   - ספריית `docx` v9.7.1 לייצור מסמך Word עם RTL עברי
   - `generateReport(data: ReportData)` → יוצר Document + Packer.toBlob + הורדה אוטומטית
   - Helper functions: `rtlParagraph`, `sectionHeading`, `multilineParagraphs`, `emptyLine`
   - שני סוגי דוחות: `"summary"` / `"continuation"`

2. **`src/components/reports/ReportModal.tsx`** (חדש)
   - מודל טופס עם כל שדות הדוח: כותרת, רקע, מטרות, התקדמות, סיכום
   - Pre-fill אוטומטי: שם משפחה, שם ילד/ה, טווח תאריכים מטיפולים, מספר טיפולים, מטרות
   - כפתור "הפק מסמך Word" → מוריד .docx

3. **`src/components/reports/ReportsTab.tsx`** (חדש)
   - שני כרטיסים: "סיכום טיפול" ו-"בקשה להמשך טיפול"
   - לחיצה → פותח `ReportModal` עם סוג הדוח המתאים

4. **`src/pages/PatientDetailPage.tsx`** (עודכן)
   - הוסף `import { ReportsTab }`
   - הוסף `"reports"` ל-`Tab` type וה-tabs array
   - הוסף `{activeTab === "reports" && <ReportsTab patient={patient} />}`

---

## 2026-05-27

### נושאים שנדונו — לא יושמו

**PWA — כפתור התקנה:**
- Android: אפשרי דרך `beforeinstallprompt` event
- iOS: לא אפשרי programmatically — רק הוראות ידניות
- לא יושם עדיין

**שליחת זימונים ללוח שנה של מטופלים:**
- נבדקו אפשרויות: SendGrid (60 יום בלבד), Resend (דורש דומיין), Brevo (72% deliverability לגמייל), Gmail SMTP (דורש 2FA)
- הפתרון המתאים ביותר: **Google Calendar API עם OAuth** — שולח זימון ישירות מגוגל, אין צורך בדומיין/SMTP
- **לא יושם** — נשאיר לסשן עתידי

---

## 2026-05-24 (המשך — סוף סשן)

### תיקונים + פיצ'רים נוספים

**תיקון toggle ברירת מחדל:**
- `payment_received` ו-`invoice_issued` מתחילים ב-`false` (לא `null`) לרשומות חדשות
- הבאג: השינוי לא הועלה ב-commit הקודם — תוקן ונשלח בנפרד

**שני badges במקום אחד:**
- `TreatmentsTab`: `showNoInvoice` עצמאי — מוצג גם כשגם תשלום וגם חשבונית חסרים
- `SuperviseeDetailPage`: אותו תיקון

**עריכת טיפול מדף הטיפול (TreatmentDetailPage):**
- לא העביר `requiresPayment` ל-`TreatmentFormModal` → section תשלום היה מוסתר
- תוקן: מוסיף `usePatient(patientId)` ומעביר `requiresPayment={patient?.requires_payment ?? false}`

**auto-open טיפול מלוח שנה (תיקון כפול):**
- בעיה א׳: `location.state` נוקה לפני שהמטופל נטען → `autoOpenTreatment` היה `false` בעת רנדור TreatmentsTab
  - תיקון: `[autoOpenTreatment] = useState(...)` — ערכים נשמרים גם אחרי ניקוי state
- בעיה ב׳: אחרי שמירת טיפול → refetch → loading → TreatmentsTab remount עם `autoOpen=true` → פורם נפתח שוב
  - תיקון: `onTreatmentCountChange` מאפס `setAutoOpenTreatment(false)` לפני ה-refetch

**to-do list (migration-v27 ✅ הורץ):**
- טבלת `todos` עם RLS per user + `GRANT` נוסף + `DEFAULT auth.uid()`
- `useTodos` hook: fetch, addTodo, deleteTodo
- `TodoList` קומפוננט: input + רשימה + inline confirm "האם בוצע?" → מחיקה מ-DB
- `TodosPage` בנתיב `/todos`
- AppShell: "משימות" עם CheckSquare icon
- DashboardPage: תכנון יומי + משימות זה לצד זה (50/50, `flex-col md:flex-row`)
- תיקון מובייל: שורת אישור עברה לשתי שורות

**PWA — התקנה כאפליקציה:**
- `vite-plugin-pwa` עם `generateSW` (Workbox)
- `public/icon.svg` — סטטוסקופ לבן על רקע sky-600
- manifest: RTL, standalone, theme_color, short_name "קלינאות"
- `index.html`: apple-mobile-web-app meta tags לאייפון
- התקנה: Safari → שתף → "הוסף למסך הבית"

**כלל מובייל ב-learning.md:**
- נוסף סקשן "כלל מובייל — חובה" עם טבלת בדיקות ודגלים אדומים

**מיגרציות — הכל הורץ ✅:** v23, v24, v25, v26, v27

---

## 2026-05-24

### תשלום הדרכות + תיקון VIEW + YesNoToggle משותף

**תיקון קריטי — `patients_with_stats` VIEW (migration-v25, צריך להריץ):**
- PostgreSQL VIEW מרחיב `p.*` בזמן יצירה — הוספת עמודה לטבלה לא מעדכנת VIEW קיים
- `requires_payment` לא הוחזר מ-`usePatient` כי VIEW לא ידע על העמודה
- פתרון: DROP + CREATE מחדש של `patients_with_stats`

**הדרכות — תשלום (migration-v26, צריך להריץ):**
- `supervisees.requires_payment` (boolean, default false)
- `supervision_sessions.payment_received` (boolean, nullable)
- `supervision_sessions.invoice_issued` (boolean, nullable)
- `supervision_sessions.meeting_url` (text, nullable) — קישור לפגישה אונליין

**תיקון:** meeting_url עבר מ-`meetings` ל-`supervision_sessions` (v24 היה שגוי — המשתמשת התכוונה להדרכות, לא לפגישות)

**YesNoToggle — קומפוננט משותף:**
- `src/components/common/YesNoToggle.tsx`
- Props: `value: boolean | null`, `onChange: (v: boolean) => void`
- שני כפתורים: "כן" (ירוק) / "לא" (אדום)
- בשימוש ב-`TreatmentFormModal`, `SupervisionSessionModal`, `CalendarSupervisionModal`

**UI — הדרכות:**
- `SuperviseeFormModal`: checkbox "מודרכת נדרשת לתשלום"
- `SupervisionSessionModal`: שדה meeting_url + section תשלום (requiresPayment prop)
- `CalendarSupervisionModal`: שדה meeting_url + section תשלום (requiresPayment prop)
- `SuperviseeDetailPage`: badge "נדרש תשלום" (ענבר) בכרטיס header + badges "טרם שולם" / "טרם הופקה חשבונית" בשורות sessions

**UI — מטופלים:**
- `PatientDetailPage`: badge "נדרש תשלום" (ענבר) בכרטיס header

**ברירת מחדל לתשלום:**
- כל toggle של תשלום/חשבונית מתחיל ב-`false` (לא `null`) לרשומות חדשות
- `null` שמור לרשומות ישנות — אין אזהרה

**מיגרציות ממתינות להרצה בסופאבייס:**
- `migration-v25.sql` — rebuild `patients_with_stats` VIEW
- `migration-v26.sql` — supervision payment + meeting_url

---

## 2026-05-13 (סשן נוכחי — המשך 2)

### לוח שנה — הדרכות + קישור אונליין לפגישות

**הדרכה בלוח שנה:**
- אפשרות שלישית ב-EventTypePicker (אינדיגו, GraduationCap)
- `useCalendarSupervisionSessions(start, end)` — hook חדש, טוען sessions עם שם מודרכת
- `CalendarSupervisionModal` — modal חדש: dropdown מודרכות + תאריך/שעה/משך/סיכום; תומך צפייה + עריכה + מחיקה
- אירועי הדרכה על הלוח: `{session_date}T{session_time}` + חישוב end מ-duration_min

**קישור אונליין לפגישה (migration-v24, צריך להריץ):**
- `meetings.meeting_url` (text, nullable)
- `MeetingModal` — שדה URL אופציונלי + כפתור "הצטרפות לפגישה" בעת עריכה

---

## 2026-05-13 (סשן נוכחי — המשך)

### תשלום + תיקוני תצוגה

**תשלום (migration-v23, צריך להריץ בסופאבייס):**
- `patients.requires_payment` (boolean, default false) — מטופל נדרש לתשלום
- `treatments.payment_received` (boolean, nullable) — האם התקבל תשלום
- `treatments.invoice_issued` (boolean, nullable) — האם הופקה חשבונית
- `null` = טיפול ישן שלא מעקב — אין אזהרות

**UI:**
- `PatientFormModal` — checkbox "מטופל נדרש לתשלום"
- `TreatmentFormModal` — `requiresPayment` prop; מציג section עם YesNoToggle לתשלום + חשבונית
- `TreatmentRow` — badge אדום "טרם שולם" אם `payment_received === false`; badge צהוב "טרם הופקה חשבונית" אם `payment_received === true && invoice_issued === false`
- אזהרות מוצגות רק כשהשדה הוגדר במפורש (לא null = טיפולים ישנים)

**שינויים נוספים:**
- AppShell: label "מודרכות" → "הדרכות"

---

## 2026-05-13 (סשן נוכחי)

### קבצים בפרטים אישיים + תיקון מחיקת storage

**קבצים בטאב פרטים אישיים:**
- נוסף קומפוננט `PatientFilesSection` — טוען קבצים שאין להם `diagnosis_id` ולא `hearing_test_id`
- storage path: `{patientId}/general/{uuid}.{ext}` ב-bucket `patient-files`
- מוטמע בתחתית טאב "פרטים אישיים" ב-`PatientDetailPage`

**תיקון bug — מחיקת הורה לא מפינה storage:**
- `HearingTestCard.handleDelete` — מוחק קבצים מ-storage לפני מחיקת הבדיקה
- `DiagnosesTab.handleDelete` — מוחק קבצים מ-storage לפני מחיקת האבחון
- CASCADE ב-DB מוחק שורות מ-`patient_files` אבל לא את הקבצים בפועל

---

## 2026-05-13

### העלאת קבצים בבדיקות שמיעה

- נוסף `hearing_test_id` לטבלת `patient_files` (migration-v22 ✅ הורץ)
- `useHearingTests` מחזיר עכשיו `HearingTestWithFiles[]` — טוען קבצים במקביל לבדיקות
- `HearingTestsTab` — כל כרטיס בדיקה תומך בהעלאה/הצגה/מחיקה של קבצים
- storage path: `{patientId}/hearing/{testId}/{uuid}.{ext}` ב-bucket `patient-files`

---

## 2026-05-10

### תיקוני תצוגה — לוח שנה + מובייל

**לוח שנה — טקסט חתוך באירועים קצרים:**
- נוסף `eventMinHeight={36}` ל-FullCalendar ב-`CalendarView.tsx` — גובה מינימלי לכל אירוע
- נוספו CSS overrides ל-`index.css`: `fc-event-title` — `font-size: 0.72rem` + `text-overflow: ellipsis`; `fc-event-time` — `font-size: 0.68rem`
- אומת בפועל: פגישה של 10 דקות ("ערב שיח מחציית ב גאיה 15:10–15:20") מוצגת כראוי

**iOS/iPadOS — שדות תאריך ושעה:**
- `font-size: 16px` על כל inputs ב-iOS מונע auto-zoom של Safari (קורה כשגופן < 16px)
- `-webkit-appearance: none` + `min-height: 2.5rem` לשדות `date`, `time`, `datetime-local`
- כל זה תחת `@supports (-webkit-touch-callout: none)` — לא משפיע על desktop

---

## 2026-05-03 (סשן נוכחי)

### תיקוני באגים מהלקוח

**באג 1 — כפל מטרות בתיעוד טיפול:**
- `addGoal` ב-`TreatmentFormModal` לא בדק כפילות לפני הוספה
- **תיקון:** בדיקה לפי טקסט לפני הוספה:
  - מטרה קיימת + הושלמה → מוחזרת לפעילה (מתעדכן ב-`patient_goals` בשמירה)
  - מטרה קיימת + פעילה → no-op
  - חדשה → נוסף רגיל

**באג 2 — טופס טיפול נפתח שוב לאחר שמירה (מלוח שנה):**
- שורש הבעיה: `onTreatmentCountChange()` → `refetch` → `loading: true` → PatientDetailPage מציג ספינר → TreatmentsTab נמחק ומורכב מחדש → `useState(autoOpen)` מתאתחל ל-`true` כי `location.state` לא נוקה
- **תיקון:** `useEffect` ב-PatientDetailPage שמנקה `location.state` מיד בעלייה: `navigate(pathname, { replace: true, state: null })`

### Idle Session Timeout — ניתוק אוטומטי
- נוסף hook `useIdleTimeout` — מנטר חוסר פעילות (עכבר/מקלדת/מגע)
- אחרי 30 דק' חוסר פעילות → מוצג דיאלוג אזהרה עם ספירה לאחור (60 שניות)
- אחרי הספירה → `supabase.auth.signOut()` + ניווט ל-login
- כפתור "המשך" מאפס את הטיימר
- `IdleTimeoutModal` ב-`AppShell` — פעיל בכל הדפים

---

## 2026-05-03

### ייצוא טיפולים ל-PDF
- נוסף כפתור **"ייצא טיפולים"** בטאב "תיק טיפול" (מופיע רק כשיש טיפולים)
- נוצר קומפוננט `TreatmentsPrintModal` — טוען את כל הטיפולים + מטרות לפי `treatment_goals`, ממיין מהאחרון לראשון, מציג תצוגה מקדימה
- כפתור "הדפס / PDF" קורא ל-`window.print()` — ללא ספריות חיצוניות
- CSS `@media print`: `position: absolute`, `height: auto`, `overflow: visible` על המיכל הפנימי כדי שכל הטיפולים יודפסו ולא רק מה שנראה במסך
- `TreatmentsTab` קיבל prop `patientName` (מועבר מ-`PatientDetailPage`)

### תיקון TreatmentDetailPage — מטרות מסנאפשוט
- הוחלף `usePatientGoals(patientId)` (כל המטרות של המטופל) בשאילתה ישירה על `treatment_goals` לפי `treatmentId`
- עכשיו הדף מציג בדיוק את המטרות שהיו בטיפול הזה בזמן השמירה

### migration-v21 — backfill לכל הטיפולים
- מקשר **כל** טיפול קיים למטרות המטופל שלו (לא רק הטיפול האחרון כמו v20)
- `WHERE NOT EXISTS` — בטוח להרצה חוזרת
- **צריך להריץ:** v19 קודם, אחר כך v21

---

## 2026-05-03 (מוקדם יותר)

### תיקון מטרות בתיעוד טיפול — ארכיטקטורת snapshot
**הבעיה:** מטרות לא הוצגו בטיפול, הסרה מחקה מהמטופל, לא נשמרה היסטוריה נכונה.

**הפתרון:**
- נוצרה טבלת `treatment_goals` (junction) שמקשרת `treatments.id → patient_goals.id`
- כל שמירת טיפול מבצעת snapshot: delete+insert ל-`treatment_goals`
- **הסרת מטרה בטיפול** — לא מוחקת מ-`patient_goals`, רק מסירה מה-snapshot
- **הוספת מטרה חדשה** — upsert ל-`patient_goals` + נכנסת ל-snapshot
- **טיפול חדש** — טוען מטרות מה-snapshot של הטיפול **האחרון** של אותו מטופל
- **עריכת טיפול** — טוען מה-snapshot שלו, fallback ל-all patient_goals (לנתונים ישנים)

**`syncGoals(goals, patientId, treatmentId)`** — הפונקציה המרכזית ב-`TreatmentFormModal`:
1. Update `done` לגולים ששינו סטטוס
2. Upsert גולים חדשים ל-`patient_goals`
3. Resolve IDs של הגולים שנוספו
4. Delete + re-insert ב-`treatment_goals`

### PatientGoalsTab — הוסר GoalPicker
- הסרת אפשרות הוספת מטרות מהטאב "מטרות"
- מטרות מתווספות **רק** דרך תיעוד טיפול
- נשמרו: toggle done, מחיקה
- הודעת empty state עודכנה: "ניתן להוסיף דרך תיעוד טיפול"

---

## 2026-05-02 (ספרינט קודם)

### תור מיגרציות — v20
- backfill `treatment_goals` לטיפול האחרון בלבד לכל מטופל (הוחלף ע"י v21)

### ייצוא תיק טיפול — גרסה ראשונה
- נבנתה ה-print modal הראשונה

---

## 2026-04-XX (ספרינטים קודמים)

### לוח שנה — פגישות חוזרות (recurring appointments)
- ממשק multi-phase ב-`AppointmentModal`: `form → checking → conflict → confirm`
- שדה `weeks` (1–52) ליצירת סדרת פגישות
- זיהוי קונפליקטים: פגישות קיימות + ישיבות + חגים ישראליים (`israeliHolidays.ts`)
- סדרה נשמרת עם `series_id`, `series_total`, `series_index` על כל appointment
- סימון ⚠️ + גבול ענבר בלוח לטיפולים אחרונים בסדרה (second-to-last + last)
- CSS: `.fc .series-ending { border: 2px solid #f59e0b }`

### בנק מטרות — bulk category
- בחירת ריבוי מטרות עם checkboxes
- Action bar sticky: dropdown קטגוריות + כפתור "שייך"
- `handleBulkAssign`: `.update({ category_id }).in("id", [...selectedIds])`

### הדרכה — הסרת מטרות
- הוסרו מטרות לחלוטין מ-`SupervisionSessionModal` ו-`SuperviseeDetailPage`
- הוסרו: GoalPicker, parseGoals, serializeGoals, goals state

### דשבורד — ספירת הדרכות
- נוספה סטטיסטיקת הדרכות חודש נוכחי
- מוצגת רק אם יש הדרכות (grid דינמי 2/3 עמודות)

### migrations → תיקייה
- כל קבצי ה-SQL הועברו מה-root ל-`migrations/`

---

## הערות כלליות

- **הורץ בסופאבייס (2026-05-03):** v19 ✅, v21 ✅ — טבלת `treatment_goals` קיימת ומאוכלסת
- **הורץ בסופאבייס (2026-05-13):** v22 ✅ — `hearing_test_id` ל-`patient_files`
- **הורץ בסופאבייס (2026-05-24):** v23 ✅, v25 ✅, v26 ✅, v27 ✅ — כל המיגרציות עד כה הורצו
- **FinBot API** — נבחן אפשרות חיבור (API key בהגדרות עסק, endpoint: `POST https://api.finbotai.co.il/income`) — לא יושם עדיין
