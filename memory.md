# Session Memory — Ilona Clinic

סיכום עבודה לפי תאריכים, מהחדש לישן.

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
- **FinBot API** — נבחן אפשרות חיבור (API key בהגדרות עסק, endpoint: `POST https://api.finbotai.co.il/income`) — לא יושם עדיין
