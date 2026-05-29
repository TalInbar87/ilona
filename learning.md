# Learning — Ilona Clinic Project Reference

מסמך הפניה מהיר. כל מה שצריך לדעת כדי לעבוד על הפרויקט ללא למידה מחדש.

---

## 🔒 אבטחה — חוק קבוע (מידע רפואי)

המערכת מכילה מידע רפואי רגיש. **כל** שינוי במבנה הנתונים חייב לעמוד בסטנדרטים הבאים.

### צ'קליסט לכל migration חדש

- [ ] **RLS מופעל** — `ALTER TABLE x ENABLE ROW LEVEL SECURITY` על כל טבלה חדשה
- [ ] **Policy לפי בעלות משתמש** — `USING (created_by = auth.uid() OR public.is_superuser())`
- [ ] **לא** `USING (true)` — זה פותח לכל משתמש מחובר
- [ ] **WITH CHECK** — גם לכתיבה, לא רק לקריאה
- [ ] **GRANT מוגדר** — `GRANT SELECT/INSERT/UPDATE/DELETE ON x TO authenticated` (לא יותר ממה שצריך)
- [ ] **service_role key לא בקוד client** — רק anon key בצד הלקוח
- [ ] **אין raw queries** עם string concatenation — תמיד Supabase SDK / parameterized

### כשטבלה מקושרת ל-patients (ולא ישירות ל-user)

Policy דרך join:
```sql
USING (
  patient_id IN (
    SELECT id FROM patients WHERE created_by = auth.uid()
  )
  OR public.is_superuser()
)
```

### דוגמה נכונה לטבלה חדשה

```sql
CREATE TABLE new_table (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  ...
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_new_table" ON new_table
  FOR ALL TO authenticated
  USING  (created_by = auth.uid() OR public.is_superuser())
  WITH CHECK (created_by = auth.uid() OR public.is_superuser());

GRANT SELECT, INSERT, UPDATE, DELETE ON new_table TO authenticated;
```

---

## Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (RTL, `direction: rtl` ב-body) |
| DB / Auth / Storage | Supabase (PostgreSQL + RLS) |
| Router | React Router v6 |
| Calendar | FullCalendar |
| Icons | Lucide React |
| Dates | date-fns + `he` locale |
| Font | Assistant (Google Fonts) |
| Deploy | Vercel |

**env vars:**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

**Storage buckets:** `patient-files`, `treatment-files`, `supervisee-files`

---

## ארכיטקטורה כללית

```
src/
├── App.tsx                  # Router
├── store/authStore.ts       # Zustand auth state
├── lib/
│   ├── supabase.ts          # supabase client + STORAGE_BUCKETS
│   ├── utils.ts             # formatDate, calcAgeLabel, formatDateTime, validateIsraeliId
│   └── israeliHolidays.ts   # מערך חגים לזיהוי קונפליקטים בלוח
├── types/
│   ├── database.types.ts    # auto-generated מסופאבייס
│   └── index.ts             # re-exports נוחים (Patient, Treatment, ...)
├── hooks/                   # כל ה-hooks — useX(id) → { data, loading, error, refetch }
├── components/              # קומפוננטים לפי תחום
└── pages/                   # דפים (אחד לנתיב)
```

### נתיבים (Routes)
```
/                          → DashboardPage
/patients                  → PatientsPage
/patients/:patientId       → PatientDetailPage  (tabs: פרטים | שמיעה | אבחונים | טיפול | מטרות)
/patients/:id/treatments/:id → TreatmentDetailPage
/supervisees               → SuperviseesPage
/supervisees/:id           → SuperviseeDetailPage
/calendar                  → CalendarPage
/goals-bank                → GoalsBankPage
/users                     → UsersPage  (superuser בלבד)
```

---

## טבלאות DB

### `patients`
שדות עיקריים: `id, full_name, date_of_birth, id_number, phone, email, parent_name, notes, archived_at, created_by, requires_payment (bool, default false)`

**View:** `patients_with_stats` — מוסיף `age` (מחושב), `treatment_count`, `is_archived`

> ⚠️ **PostgreSQL VIEW gotcha:** `SELECT p.*` בתוך VIEW מורחב בזמן יצירת ה-VIEW — הוספת עמודה חדשה לטבלה **לא** תופיע ב-VIEW אוטומטית. חייבים `DROP VIEW … CASCADE` ו-`CREATE VIEW` מחדש אחרי כל הוספת עמודה ל-`patients`.

### `diagnoses`
`id, patient_id, title, description, goals (text), diagnosed_at, created_by`

### `patient_goals`  ← **חשוב**
```
id, patient_id, text, done (bool), sort_order, category_id, created_by
UNIQUE (patient_id, text)
```
מטרות **ברמת המטופל**. לא נמחקות בעת הסרה מטיפול.

### `treatment_goals`  ← **חדש (v19)**
```
id, treatment_id, goal_id, created_at
UNIQUE (treatment_id, goal_id)
FK: treatment_id → treatments(id) ON DELETE CASCADE
FK: goal_id      → patient_goals(id) ON DELETE CASCADE
```
**Snapshot per treatment** — מה המטרות שהיו פעילות בטיפול הזה. מתעדכן בכל שמירה.

### `treatments`
```
id, patient_id, session_date, session_time, duration_min,
notes, tools, next_ideas, summary (לגאסי), created_at, updated_at, created_by,
payment_received (bool|null), invoice_issued (bool|null)
```
`null` = טיפול ישן שנוצר לפני v23 — לא מציגים אזהרה. `false` = הוגדר במפורש.

### `treatment_files`
`id, treatment_id, patient_id, file_name, storage_path, mime_type, file_size, uploaded_at, uploaded_by`

### `treatment_goals_bank`
`id, text, use_count, category_id, created_by` — בנק מטרות גלובלי

### `goal_categories`
`id, name, color (hex), sort_order, created_by`

### `appointments`
```
id, patient_id, start_time, end_time, title, status, treatment_id,
notes, series_id, series_total, series_index, created_at, created_by
status: "scheduled" | "completed" | "cancelled" | "no_show"
```
`series_id` — UUID משותף לכל הפגישות בסדרה. `series_index` מתחיל מ-1.

### `meetings`
`id, title, start_time, end_time, meeting_url (text|null), created_by` — ישיבות (ללא מטופל)

### `hearing_tests`
`id, patient_id, test_date, results, notes, created_at, created_by`

### `supervisees`
`id, full_name, phone, email, notes, requires_payment (bool, default false), created_at, updated_at, created_by`

### `supervision_sessions`
```
id, supervisee_id, session_date, session_time, duration_min, summary, created_by,
payment_received (bool|null), invoice_issued (bool|null), meeting_url (text|null)
```
`null` = סשן ישן שלא עוקב — אין אזהרה. `false` = הוגדר במפורש.

### `todos`
`id, text (not null), created_at, created_by (FK auth.users, DEFAULT auth.uid())`
RLS: כל משתמש רואה רק את המשימות שלו. אין עמודת `done` — סימון → אישור → מחיקה מ-DB.

### `supervision_files`
`id, session_id, supervisee_id, file_name, storage_path, mime_type, file_size, uploaded_by`

### `profiles`
`id, is_superuser, first_name, last_name, created_at`

### `patient_files`
`id, patient_id, diagnosis_id, hearing_test_id, file_name, storage_path, mime_type, file_size, uploaded_at, uploaded_by`

`diagnosis_id` ו-`hearing_test_id` — שניהם nullable, FK עם ON DELETE CASCADE. קובץ שייך לאחד מהם.
קבצים ללא שניהם (שני שדות `null`) = קבצים כלליים של המטופל (מ-PatientFilesSection בטאב פרטים אישיים).

**אזהרה:** `ON DELETE CASCADE` מוחק שורות DB בלבד — לא את הקבצים בפועל מ-Storage. לכן בכל מחיקת הורה (אבחון / בדיקת שמיעה) חייבים לקרוא ל-`storage.remove()` לפני מחיקת השורה.

---

## RLS — מדיניות כללית

כל טבלה: `created_by = auth.uid() OR public.is_superuser()`

פונקציית עזר: `public.is_superuser()` — בודק `profiles.is_superuser`.

---

## היסטוריית מיגרציות

| גרסה | תיאור |
|------|-------|
| v2 | סכמה בסיסית — patients, treatments, diagnoses, patient_files, treatment_files |
| v3 | עמודת `goals` (text) ל-diagnoses |
| v4 | Multi-user: RLS + created_by לכל הטבלאות |
| v5 | `treatment_goals_bank` — בנק מטרות גלובלי |
| v6 | הסרת unique constraint על `patients.id_number` |
| v7 | `profiles` + `is_superuser` + פונקציית `is_superuser()` |
| v8 | עמודת `tools` ל-treatments |
| v9 | עמודת `email` ל-patients |
| v10 | rebuild `patients_with_stats` view (לאחר הוספת email) |
| v11 | שדות שמיעה ישירות ב-patients (הוחלפו ב-v12) |
| v12 | טבלת `hearing_tests` נפרדת (במקום עמודות ב-patients) |
| v13 | `first_name`, `last_name` ל-profiles |
| v14 | FK על created_by/uploaded_by → `ON DELETE SET NULL` |
| v15 | — (לא קיים) |
| v16 | `patient_goals` — מטרות ברמת מטופל (במקום JSON ב-treatments) |
| v17 | `goal_categories` + `category_id` ל-patient_goals ו-treatment_goals_bank |
| v18 | `series_id`, `series_total`, `series_index` ל-appointments |
| **v19** | `treatment_goals` junction table — snapshot per treatment ✅ הורץ |
| v20 | backfill treatment_goals לטיפול האחרון בלבד (מיותר, v21 מחליפו) |
| **v21** | backfill treatment_goals לכל הטיפולים ✅ הורץ |
| **v22** | `hearing_test_id` ל-patient_files — קבצים לבדיקות שמיעה ✅ הורץ |
| **v23** | `patients.requires_payment` + `treatments.payment_received` + `treatments.invoice_issued` |
| **v24** | `meetings.meeting_url` — קישור לפגישה אונליין (קיים ב-DB, לא בשימוש ב-UI) |
| **v25** | rebuild `patients_with_stats` VIEW — לאחר הוספת `requires_payment` לטבלה ✅ הורץ |
| **v26** | `supervisees.requires_payment` + `supervision_sessions.payment_received/invoice_issued/meeting_url` ✅ הורץ |
| **v27** | טבלת `todos` עם RLS + GRANT + DEFAULT auth.uid() ✅ הורץ |

---

## כלל מובייל — חובה

**כל** קומפוננט ודף חייב להיות מותאם למובייל. לפני כל שינוי UI לבדוק:

| בדיקה | כלי |
|-------|-----|
| layout צר (375px) | `flex-col md:flex-row` — ברירת מחדל עמודה, שורה רק ב-md+ |
| כפתורים ואזורי לחיצה | גובה מינימלי `min-h-[44px]` או `py-2.5+` לנגיעה נוחה |
| טקסטים ושורות ממשק | `truncate` או `flex-wrap` — לא לאפשר גלישה מחוץ לגבולות |
| שורות עם הרבה אלמנטים | לפצל לשתי שורות במובייל (`space-y-2` + `flex items-center justify-end`) |
| שדות קלט | `input-base` כבר כולל `font-size: 16px` ב-iOS — לא לשנות |
| padding של דפים | `p-4 md:p-6` — תמיד |
| כרטיסים זה לצד זה | `flex flex-col md:flex-row gap-4` עם `flex-1 min-w-0` על כל ילד |
| כפתורי touch | `active:scale-95` לפידבק ויזואלי במובייל |

**דגל אדום:** שורה אחת עם 4+ אלמנטים ללא `flex-wrap` — תמיד בעיה במובייל.

---

## פטרנים חשובים

### 1. syncGoals — שמירת מטרות טיפול

```typescript
// ב-TreatmentFormModal.tsx
async function syncGoals(goals: LocalGoal[], patientId: string, treatmentId: string) {
  // 1. update done ל-DB goals ששינו סטטוס
  // 2. upsert גולים חדשים ל-patient_goals (onConflict: "patient_id,text")
  // 3. resolve IDs של הגולים שנוספו לפי text
  // 4. delete + re-insert treatment_goals snapshot
}
```

**LocalGoal:** `{ id, text, done, source: "db"|"new", originalDone?, categoryId? }`

הסרת מטרה בטיפול ← **לא** מוחקת מ-`patient_goals`, רק לא נכנסת ל-snapshot.

### 2. טעינת מטרות לטיפול

```
עריכת טיפול → treatment_goals של אותו treatment
               fallback: patient_goals (לטיפולים ישנים ללא snapshot)

טיפול חדש   → treatment_goals של הטיפול האחרון של המטופל
               אם אין — רשימה ריקה
```

### 3. שאילתה לטעינת מטרות מה-snapshot

```typescript
// לטיפול בודד
supabase
  .from("treatment_goals")
  .select("patient_goals!goal_id(id, text, done)")
  .eq("treatment_id", treatmentId)

// לטיפולים מרובים (print)
supabase
  .from("treatment_goals")
  .select("treatment_id, patient_goals!goal_id(id, text, done)")
  .in("treatment_id", ids)
```

### 4. Nullable Boolean — מעקב תשלום

שדות `payment_received` ו-`invoice_issued` הם `boolean | null`:

| ערך | משמעות | אזהרה? |
|-----|--------|--------|
| `null` | רשומה ישנה שנוצרה לפני v23/v26 — לא עוקב | לא |
| `false` | הוגדר במפורש: לא שולם / לא הופקה | **כן** — badge אדום/ענבר |
| `true` | כן, שולם / הופקה | לא (או badge כשתשלום התקבל אך חשבונית עדיין לא) |

**חשוב:** תנאי אזהרה תמיד `=== false`, **אף פעם לא** `!value` (כי `null` גם falsy).

ברירת מחדל לרשומות **חדשות**: `false` (לא `null`).

`YesNoToggle` מציג שני כפתורים ומאפשר toggle בין `true`/`false` (לא ניתן לחזור ל-`null` דרך ה-UI).

### 5. Supabase — אין Promise.all
שאילתות Supabase **לא** real Promises. להשתמש ב-`for...of await` ולא ב-`Promise.all`.

### 6. Supabase Update vs Insert types
בעדכון (`update`) אין לכלול שדות שמוגדרים כ-`never` ב-Update type — לדוגמה, `supervisee_id` בטבלת `supervision_sessions`. להפריד payload:
```typescript
const basePayload = { /* שדות משותפים */ };
if (session) {
  await supabase.from("supervision_sessions").update(basePayload).eq("id", session.id);
} else {
  await supabase.from("supervision_sessions").insert({ ...basePayload, supervisee_id: form.supervisee_id });
}
```

### 7. פגישות חוזרות — series
- `series_id` = UUID זהה לכל הפגישות בסדרה
- `series_total` = סה"כ פגישות, `series_index` = מספר סידורי (1-based)
- **סימון בלוח:** `series_index === series_total` (אחרונה) או `series_index === series_total - 1` → class `series-ending` + גבול ענבר
- CSS ב-`index.css`: `.fc .series-ending { border: 2px solid #f59e0b !important }`

### 8. Print CSS
```css
@media print {
  body * { visibility: hidden; }
  .treatments-print-root,
  .treatments-print-root * { visibility: visible; }
  .treatments-print-root {
    position: absolute !important; top: 0; left: 0;
    width: 100%; height: auto !important; overflow: visible !important;
  }
  .treatments-print-inner { overflow: visible !important; height: auto !important; }
  .no-print { display: none !important; }
}
```
**חשוב:** `position: fixed` + `overflow: auto` מדפיסים רק מה שנראה במסך — חייבים לאפס בprint.

---

## Hooks — סיכום

| Hook | פרמטר | מחזיר |
|------|--------|--------|
| `usePatient(id)` | patientId | `{ data: PatientWithStats, loading, error, refetch }` |
| `usePatients()` | — | `{ data: PatientWithStats[], loading, error, refetch }` |
| `usePatientGoals(id)` | patientId | `{ data: PatientGoal[], loading, refetch }` |
| `useTreatments(id)` | patientId | `{ data: Treatment[], loading, error, refetch }` |
| `useTreatment(id)` | treatmentId | `{ treatment, files, loading, refetch }` |
| `useDiagnoses(id)` | patientId | `{ data, loading, refetch }` |
| `useHearingTests(id)` | patientId | `{ data: HearingTestWithFiles[], loading, refetch }` |
| `useAppointments(...)` | range | `{ data: Appointment[], loading, refetch }` |
| `useMeetings(...)` | range | `{ data: Meeting[], loading, refetch }` |
| `useGoalCategories()` | — | `{ data: GoalCategory[], loading, refetch }` |
| `useGoalsBank(...)` | filters | `{ data, loading, refetch }` |
| `useSupervisees()` | — | `{ data, loading, refetch }` |
| `useSupervisionSessions(id)` | superviseeId | `{ data, loading, refetch }` |
| `useSupervisionSession(id)` | sessionId (optional) | `{ files, refetch }` — קבצים לסשן בודד |
| `useCalendarSupervisionSessions(start, end)` | range strings | `{ data: CalendarSupervisionSession[], refetch }` |
| `useTodos()` | — | `{ data: Todo[], loading, refetch, addTodo, deleteTodo }` |

---

## קומפוננטים מרכזיים

| קובץ | תפקיד |
|------|--------|
| `TreatmentFormModal` | יצירה/עריכה של טיפול + ניהול מטרות + קבצים |
| `TreatmentsPrintModal` | תצוגה מקדימה + הדפסת כל הטיפולים כ-PDF |
| `TreatmentsTab` | רשימת טיפולים + כפתורי ייצא/חדש |
| `PatientGoalsTab` | הצגת מטרות מטופל (toggle/delete בלבד — אין הוספה) |
| `PatientFilesSection` | קבצים כלליים של מטופל (טאב פרטים אישיים) — ללא diagnosis/hearing_test |
| `GoalPicker` | input + autocomplete מ-bank (בשימוש ב-TreatmentFormModal בלבד) |
| `AppointmentModal` | multi-phase: form → checking → conflict → confirm |
| `CalendarView` | FullCalendar + סימון series-ending + EventTypePicker (3 סוגי אירועים) |
| `CalendarSupervisionModal` | יצירה/עריכה/מחיקה של הדרכה מלוח שנה + dropdown מודרכות + תשלום |
| `GoalsBankPage` | בנק מטרות + bulk category assignment |
| `FileItem` | הצגת קובץ + מחיקה מ-storage |
| `YesNoToggle` | `src/components/common/YesNoToggle.tsx` — toggle כן/לא עם nullable boolean |
| `TodoList` | `src/components/todos/TodoList.tsx` — add + list + inline confirm → delete. prop: `compact?` |

---

## Auth Store (`src/store/authStore.ts`)

Zustand store — state מרכזי לאימות.

| שדה | תיאור |
|-----|--------|
| `session` | Supabase Session |
| `user` | Supabase User |
| `isSuperuser` | מ-`profiles.is_superuser` |
| `forcePasswordChange` | מ-`app_metadata.force_password_change` |
| `firstName`, `lastName` | מ-`profiles` |
| `loading` | auth session loading (שומר ProtectedRoute על spinner) |
| `superuserLoading` | profile loading |

**`init()`** — נקרא ב-`App.tsx` פעם אחת. טוען session + מאזין ל-`onAuthStateChange`.
**`signOut()`** — `supabase.auth.signOut()` + איפוס state.
**`refreshProfile()`** — refetch בלבד, ללא loading state.

`fetchProfile` — עם timeout של 5 שניות ו-fallback. אף פעם לא throws.

## FullCalendar — תצוגת אירועים קצרים

**בעיה:** בפגישות קצרות (10–15 דקות) הטקסט נחתך כי ה-event box קטן מדי.

**פתרון:**
- `eventMinHeight={36}` כ-prop ל-`<FullCalendar>` ב-`CalendarView.tsx` — גובה מינימלי לכל אירוע
- CSS ב-`index.css`:
```css
.fc .fc-timegrid-event .fc-event-main { padding: 1px 3px; overflow: hidden; }
.fc .fc-timegrid-event .fc-event-title { font-size: 0.72rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc .fc-timegrid-event .fc-event-time  { font-size: 0.68rem; white-space: nowrap; overflow: hidden; }
```

**אזהרה:** **אל תסיר** את `position: absolute` מ-`.fc-timegrid-event` — זה חלק מ-FullCalendar layout ויישבור את הגריד. הבעיה היא גובה, לא מיקום.

---

## iOS / iPadOS — שדות קלט

**בעיה:** Safari מ-iOS מבצע auto-zoom לשדה שגודל הגופן שלו < 16px בעת focus.

**פתרון ב-`index.css`:**
```css
@supports (-webkit-touch-callout: none) {
  input, textarea, select {
    font-size: 16px;
  }
  input[type="date"],
  input[type="time"],
  input[type="datetime-local"] {
    -webkit-appearance: none;
    appearance: none;
    min-height: 2.5rem;
    line-height: normal;
  }
}
```
`@supports (-webkit-touch-callout: none)` מזהה iOS/iPadOS בלבד — אין השפעה על desktop.

---

## Idle Session Timeout

**קבצים:** `src/hooks/useIdleTimeout.ts`, `src/components/layout/IdleTimeoutModal.tsx`
**מיקום:** מוטמע ב-`AppShell` — פעיל בכל הדפים המוגנים.

**פרמטרים:**
- `IDLE_TIMEOUT_MS = 30 * 60 * 1000` (30 דקות)
- `WARNING_SECONDS = 60` (ספירה לאחור)

**אירועי activity:** `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`

**זרימה:**
```
30 דק' ללא פעילות → showWarning=true → ספירה 60→0 → signOut() + navigate("/login")
פעילות / לחיצת "המשך" → reset timer → showWarning=false
```

## PWA — התקנה כאפליקציה

**פלאגין:** `vite-plugin-pwa` (generateSW mode, Workbox)

**קבצים:**
- `public/icon.svg` — אייקון סטטוסקופ לבן על רקע sky-600
- `vite.config.ts` — הגדרות manifest + workbox caching
- `index.html` — apple-mobile-web-app meta tags

**התקנה:**
- iOS: Safari → שתף ⬆️ → "הוסף למסך הבית"
- Android: Chrome → תפריט ⋮ → "הוסף למסך הבית"

**אחרי הוספה:** נפתח ב-fullscreen ללא סרגל דפדפן, עם אייקון על מסך הבית.

> ⚠️ אם מוסיפים עמודה ל-`patients` — חייבים לעשות DROP+CREATE לview `patients_with_stats` (p.* מצולם בזמן יצירה).

## FinBot API (עתידי)

חיבור לממשק חשבוניות:
- **Endpoint:** `POST https://api.finbotai.co.il/income`
- **Auth:** header `secret: <api_key>`
- **API key:** הגדרות עסק ב-FinBot ← "צור API Key"
- **תיעוד:** https://finbot.helpjuice.com/he_IL/api-docs-create-income
- **סטטוס:** לא יושם עדיין

---

## גלוסרי

| מונח | משמעות |
|------|--------|
| snapshot | הרשימה של מטרות שנשמרה ב-`treatment_goals` לטיפול מסוים |
| backfill | שאילתת SQL שממלאת נתונים חסרים בטבלה חדשה מנתוני טבלאות קיימות |
| series | קבוצת פגישות חוזרות שנוצרו ביחד (שבועי) |
| superuser | משתמש עם `profiles.is_superuser = true` — גישה לכל הנתונים |
| created_by | UUID של המשתמש שיצר את הרשומה — בסיס ל-RLS |
