import { useState, useEffect } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { useTreatments } from "../../hooks/useTreatments";
import { usePatientGoals } from "../../hooks/usePatientGoals";
import { generateReport, type ReportType } from "../../lib/generateReport";
import { formatDate } from "../../lib/utils";
import type { PatientWithStats } from "../../types";

interface Props {
  patient: PatientWithStats;
  reportType: ReportType;
  onClose: () => void;
}

export function ReportModal({ patient, reportType, onClose }: Props) {
  const { data: treatments, loading: loadingTreatments } = useTreatments(patient.id);
  const { data: goals, loading: loadingGoals } = usePatientGoals(patient.id);

  const defaultFamilyName = patient.full_name.split(" ").pop() ?? patient.full_name;

  const [form, setForm] = useState({
    familyName: defaultFamilyName,
    childName: patient.full_name,
    idNumber: patient.id_number ?? "",
    dateOfBirth: patient.date_of_birth ? formatDate(patient.date_of_birth) : "",
    dateRange: "",
    treatmentCount: "",
    background: "",
    goals: "",
    progress: "",
    summary: "",
  });
  const [generating, setGenerating] = useState(false);

  // Once treatments load, fill date range + count
  useEffect(() => {
    if (loadingTreatments) return;
    const dates = treatments.map((t) => t.session_date).sort();
    const dateRange =
      dates.length > 0
        ? dates.length === 1
          ? formatDate(dates[0])
          : `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`
        : "";
    setForm((f) => ({
      ...f,
      dateRange,
      treatmentCount: treatments.length.toString(),
    }));
  }, [loadingTreatments, treatments]);

  // Once goals load, fill goals text
  useEffect(() => {
    if (loadingGoals) return;
    setForm((f) => ({
      ...f,
      goals: goals.map((g) => g.text).join("\n"),
    }));
  }, [loadingGoals, goals]);

  const title =
    reportType === "summary" ? "סיכום טיפול" : "בקשה להמשך טיפול";

  const handleGenerate = async () => {
    setGenerating(true);
    await generateReport({ reportType, ...form });
    setGenerating(false);
  };

  const field = (
    label: string,
    key: keyof typeof form,
    rows?: number,
    dir?: "ltr" | "rtl"
  ) => (
    <div>
      <label className="label-base">{label}</label>
      {rows ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="input-base resize-none"
          rows={rows}
          dir={dir ?? "rtl"}
        />
      ) : (
        <input
          type="text"
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="input-base"
          dir={dir ?? "rtl"}
        />
      )}
    </div>
  );

  const isLoading = loadingTreatments || loadingGoals;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Header fields */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">כותרת המסמך</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("לכבוד משפחת", "familyName")}
              {field("שם הילד/ה", "childName")}
              {field("מספר ת.ז.", "idNumber", undefined, "ltr")}
              {field("תאריך לידה", "dateOfBirth")}
              {field("תאריכי טיפול", "dateRange")}
              {field("מס׳ טיפולים", "treatmentCount", undefined, "ltr")}
            </div>
            {isLoading && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                טוען נתונים...
              </p>
            )}
          </div>

          {/* Section 1 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">1. רקע</p>
            <textarea
              value={form.background}
              onChange={(e) => setForm({ ...form, background: e.target.value })}
              className="input-base resize-none"
              rows={4}
              placeholder="פרטי רקע על הילד/ה והפנייה לטיפול..."
              dir="rtl"
            />
          </div>

          {/* Section 2 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">2. מטרות הטיפול</p>
            <textarea
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              className="input-base resize-none"
              rows={5}
              placeholder="מטרה אחת בכל שורה..."
              dir="rtl"
            />
            <p className="text-xs text-gray-400 mt-1">מטרה אחת בכל שורה</p>
          </div>

          {/* Section 3 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">3. תיאור התקדמות</p>
            <textarea
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: e.target.value })}
              className="input-base resize-none"
              rows={5}
              placeholder="תיאור ההתקדמות לאורך הטיפול..."
              dir="rtl"
            />
          </div>

          {/* Section 4 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">4. סיכום</p>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="input-base resize-none"
              rows={4}
              placeholder="סיכום והמלצות..."
              dir="rtl"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={generating || isLoading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generating ? "מייצר מסמך..." : "הפק מסמך Word"}
          </button>
          <button onClick={onClose} className="btn-secondary px-5">ביטול</button>
        </div>
      </div>
    </div>
  );
}
