# Learning — Ilona Clinic Project Reference

מסמך הפניה מהיר. כל מה שצריך לדעת כדי לעבוד על הפרויקט ללא למידה מחדש.

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
שדות עיקריים: `id, full_name, date_of_birth, id_number, phone, email, parent_name, notes, archived_at, created_by`

**View:** `patients_with_stats` — מוסיף `age` (מחושב), `treatment_count`, `is_archived`

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
notes, tools, next_ideas, summary (לגאסי), created_at, updated_at, created_by
```

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
`id, title, start_time, end_time, created_by` — ישיבות (ללא מטופל)

### `hearing_tests`
`id, patient_id, test_date, results, notes, created_at, created_by`

### `supervisees`
`id, full_name, phone, email, notes, created_at, updated_at, created_by`

### `supervision_sessions`
`id, supervisee_id, session_date, session_time, duration_min, goals, summary, created_by`

### `supervision_files`
`id, session_id, supervisee_id, file_name, storage_path, mime_type, file_size, uploaded_by`

### `profiles`
`id, is_superuser, first_name, last_name, created_at`

### `patient_files`
`id, patient_id, diagnosis_id, file_name, storage_path, mime_type, file_size`

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
| **v19** | **`treatment_goals` junction table — snapshot per treatment** ← **חייב הרצה** |
| v20 | backfill treatment_goals לטיפול האחרון בלבד (מיותר אם מריצים v21) |
| **v21** | **backfill treatment_goals לכל הטיפולים** ← **חייב הרצה** |

**סדר הרצה נדרש: v19 ← v21**

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

### 4. Supabase — אין Promise.all
שאילתות Supabase **לא** real Promises. להשתמש ב-`for...of await` ולא ב-`Promise.all`.

### 5. פגישות חוזרות — series
- `series_id` = UUID זהה לכל הפגישות בסדרה
- `series_total` = סה"כ פגישות, `series_index` = מספר סידורי (1-based)
- **סימון בלוח:** `series_index === series_total` (אחרונה) או `series_index === series_total - 1` → class `series-ending` + גבול ענבר
- CSS ב-`index.css`: `.fc .series-ending { border: 2px solid #f59e0b !important }`

### 6. Print CSS
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
| `useHearingTests(id)` | patientId | `{ data, loading, refetch }` |
| `useAppointments(...)` | range | `{ data: Appointment[], loading, refetch }` |
| `useMeetings(...)` | range | `{ data: Meeting[], loading, refetch }` |
| `useGoalCategories()` | — | `{ data: GoalCategory[], loading, refetch }` |
| `useGoalsBank(...)` | filters | `{ data, loading, refetch }` |
| `useSupervisees()` | — | `{ data, loading, refetch }` |
| `useSupervisionSessions(id)` | superviseeId | `{ data, loading, refetch }` |

---

## קומפוננטים מרכזיים

| קובץ | תפקיד |
|------|--------|
| `TreatmentFormModal` | יצירה/עריכה של טיפול + ניהול מטרות + קבצים |
| `TreatmentsPrintModal` | תצוגה מקדימה + הדפסת כל הטיפולים כ-PDF |
| `TreatmentsTab` | רשימת טיפולים + כפתורי ייצא/חדש |
| `PatientGoalsTab` | הצגת מטרות מטופל (toggle/delete בלבד — אין הוספה) |
| `GoalPicker` | input + autocomplete מ-bank (בשימוש ב-TreatmentFormModal בלבד) |
| `AppointmentModal` | multi-phase: form → checking → conflict → confirm |
| `CalendarView` | FullCalendar + סימון series-ending |
| `GoalsBankPage` | בנק מטרות + bulk category assignment |
| `FileItem` | הצגת קובץ + מחיקה מ-storage |

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
