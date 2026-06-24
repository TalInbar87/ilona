import { useMemo, useState } from "react";
import { FileText, Printer, Info, Database } from "lucide-react";
import { HandwritingCanvas } from "../components/handwriting/HandwritingCanvas";
import { emptyHandwriting, type HandwritingData, handwritingByteSize, formatBytes } from "../lib/handwriting";
import { generateDiagnosticPdf } from "../lib/generateDiagnosticPdf";

// POC sections — placeholder until the real assessment forms are supplied.
const SECTION_LABELS = [
  "רקע והתרשמות כללית",
  "מבחנים שבוצעו וממצאים",
  "שפה והיגוי",
  "סיכום והמלצות",
];

export function DiagnosticsPocPage() {
  const [dry, setDry] = useState({
    childName: "",
    idNumber: "",
    dateOfBirth: "",
    assessmentDate: new Date().toLocaleDateString("he-IL"),
    examiner: "",
  });

  const [sections, setSections] = useState<HandwritingData[]>(
    () => SECTION_LABELS.map(() => emptyHandwriting()),
  );

  const updateSection = (i: number, data: HandwritingData) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? data : s)));

  // Live total payload size — the POC's core metric.
  const totalBytes = useMemo(
    () => sections.reduce((sum, s) => sum + handwritingByteSize(s), 0),
    [sections],
  );

  const fields = SECTION_LABELS.map((label, i) => ({ label, data: sections[i] }));

  const handlePdf = () => {
    generateDiagnosticPdf({ ...dry, fields });
  };

  const handleSaveJson = () => {
    // POC: show exactly what would be stored in the DB (json column).
    const payload = {
      ...dry,
      sections: SECTION_LABELS.map((label, i) => ({ label, handwriting: sections[i] })),
    };
    const json = JSON.stringify(payload);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `אבחון_${dry.childName || "ללא_שם"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">אבחונים</h1>
        <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-3 py-1 font-medium">
          POC — בדיקת כתיבה בעט
        </span>
      </div>

      {/* POC explainer */}
      <div className="flex items-start gap-2.5 p-3.5 bg-sky-50 border border-sky-200 rounded-xl">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <p className="text-sm text-sky-800 leading-relaxed">
          טופס ניסיוני לבדיקת כתיבה ידנית עם Apple Pencil (כולל עברית). הכתב נשמר כ<strong>וקטור</strong> —
          קומפקטי ומתאים לשמירה כ-JSON, וניתן להפיק ממנו PDF. הפרטים ה"יבשים" מתמלאים במקלדת.
        </p>
      </div>

      {/* Dry fields */}
      <div className="card space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">פרטים אישיים</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="שם הילד/ה" value={dry.childName} onChange={(v) => setDry({ ...dry, childName: v })} />
          <Field label="מספר ת.ז." value={dry.idNumber} onChange={(v) => setDry({ ...dry, idNumber: v })} dir="ltr" />
          <Field label="תאריך לידה" value={dry.dateOfBirth} onChange={(v) => setDry({ ...dry, dateOfBirth: v })} />
          <Field label="תאריך אבחון" value={dry.assessmentDate} onChange={(v) => setDry({ ...dry, assessmentDate: v })} />
          <Field label="מאבחנת" value={dry.examiner} onChange={(v) => setDry({ ...dry, examiner: v })} />
        </div>
      </div>

      {/* Handwriting sections */}
      {SECTION_LABELS.map((label, i) => (
        <div key={label} className="card space-y-2">
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          <HandwritingCanvas
            value={sections[i]}
            onChange={(d) => updateSection(i, d)}
            height={180}
            showSize
          />
        </div>
      ))}

      {/* Footer actions */}
      <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur border-t border-gray-200 -mx-4 md:-mx-6 px-4 md:px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500" dir="ltr">
          <Database className="w-3.5 h-3.5" />
          <span>JSON: {formatBytes(totalBytes)}</span>
        </div>
        <div className="flex gap-2 mr-auto">
          <button onClick={handleSaveJson} className="btn-secondary flex items-center gap-2 px-4">
            <FileText className="w-4 h-4" />
            שמור JSON
          </button>
          <button onClick={handlePdf} className="btn-primary flex items-center gap-2 px-4">
            <Printer className="w-4 h-4" />
            ייצא PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  dir = "rtl",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div>
      <label className="label-base">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base"
        dir={dir}
      />
    </div>
  );
}
