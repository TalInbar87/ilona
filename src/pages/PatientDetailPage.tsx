import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  Hash,
  Calendar,
  Pencil,
  Activity,
  Archive,
  ArchiveRestore,
  Ear,
} from "lucide-react";
import { usePatient } from "../hooks/usePatient";
import { calcAgeLabel, formatDate } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { PatientFormModal } from "../components/patients/PatientFormModal";
import { DiagnosesTab } from "../components/diagnoses/DiagnosesTab";
import { TreatmentsTab } from "../components/treatments/TreatmentsTab";
import type { TreatmentPrefill } from "../components/treatments/TreatmentFormModal";

type Tab = "details" | "diagnoses" | "treatments";

export function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Support auto-open treatment form from calendar (when appointment marked completed)
  const locationState = location.state as { openNewTreatment?: boolean; prefill?: TreatmentPrefill } | null;
  const autoOpenTreatment = !!locationState?.openNewTreatment;
  const treatmentPrefill = locationState?.prefill;

  const { data: patient, loading, error, refetch } = usePatient(patientId);
  const [activeTab, setActiveTab] = useState<Tab>(autoOpenTreatment ? "treatments" : "details");
  const [showEdit, setShowEdit] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleArchiveToggle = async () => {
    if (!patient) return;
    const isArchived = !!patient.archived_at;
    const msg = isArchived
      ? "להחזיר את המטופל לרשימה הפעילה?"
      : "להעביר את המטופל לארכיון?";
    if (!confirm(msg)) return;
    setArchiving(true);
    await supabase
      .from("patients")
      .update({ archived_at: isArchived ? null : new Date().toISOString() })
      .eq("id", patient.id);
    setArchiving(false);
    navigate("/patients");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-6 text-center text-red-500">
        שגיאה בטעינת המטופל
      </div>
    );
  }

  const tabs = [
    { id: "details" as Tab, label: "פרטים אישיים" },
    { id: "diagnoses" as Tab, label: "בדיקות שמיעה ואבחונים" },
    { id: "treatments" as Tab, label: "תיק טיפול" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/patients")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        חזרה למטופלים
      </button>

      {/* Patient Header Card */}
      <div className="card p-4 md:p-5 mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Avatar + info */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-sky-100 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-6 h-6 md:w-7 md:h-7 text-sky-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{patient.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1.5 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  {patient.id_number}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {formatDate(patient.date_of_birth)} ({calcAgeLabel(patient.date_of_birth)})
                </span>
                {patient.phone && (
                  <a
                    href={`tel:${patient.phone}`}
                    className="flex items-center gap-1 hover:text-sky-600 transition-colors"
                    dir="ltr"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {patient.phone}
                  </a>
                )}
                {patient.email && (
                  <a
                    href={`mailto:${patient.email}`}
                    className="flex items-center gap-1 hover:text-sky-600 transition-colors"
                    dir="ltr"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {patient.email}
                  </a>
                )}
                {patient.parent_name && (
                  <span className="text-gray-400">הורה: {patient.parent_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-sky-50 text-sky-700 px-2.5 py-1.5 rounded-xl">
              <Activity className="w-4 h-4" />
              <span className="font-semibold text-sm">{patient.treatment_count}</span>
              <span className="text-xs">טיפולים</span>
            </div>
            <button
              onClick={handleArchiveToggle}
              disabled={archiving}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 md:px-3 text-sm rounded-lg border transition-colors disabled:opacity-50 ${
                patient.archived_at
                  ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {patient.archived_at
                ? <><ArchiveRestore className="w-3.5 h-3.5" /><span className="hidden sm:inline"> שחזור</span></>
                : <><Archive className="w-3.5 h-3.5" /><span className="hidden sm:inline"> ארכיון</span></>}
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="btn-secondary flex items-center gap-1.5 py-1.5 px-2.5 md:px-3 text-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">עריכה</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 md:px-5 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? "border-sky-600 text-sky-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "details" && (
            <div className="space-y-3">
              <Detail label="שם מלא" value={patient.full_name} />
              <Detail label="מספר ת.ז." value={patient.id_number} mono />
              <Detail label="תאריך לידה" value={formatDate(patient.date_of_birth)} />
              <Detail label="גיל" value={calcAgeLabel(patient.date_of_birth)} />
              {patient.phone && <Detail label="טלפון" value={patient.phone} href={`tel:${patient.phone}`} />}
              {patient.email && <Detail label="מייל" value={patient.email} href={`mailto:${patient.email}`} />}
              {patient.parent_name && <Detail label="שם הורה" value={patient.parent_name} />}
              {patient.notes && <Detail label="הערות" value={patient.notes} />}

              {/* Hearing test */}
              <div className="pt-2 mt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Ear className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-medium text-gray-700">בדיקת שמיעה</span>
                </div>
                {patient.hearing_test_done ? (
                  <div className="bg-sky-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-sm text-sky-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                      בוצעה
                      {patient.hearing_test_date && (
                        <span className="text-gray-500 font-normal">
                          — {formatDate(patient.hearing_test_date)}
                        </span>
                      )}
                    </div>
                    {patient.hearing_test_results && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.hearing_test_results}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">לא בוצעה</span>
                )}
              </div>
            </div>
          )}
          {activeTab === "diagnoses" && (
            <DiagnosesTab patientId={patient.id} />
          )}
          {activeTab === "treatments" && (
            <TreatmentsTab
              patientId={patient.id}
              onTreatmentCountChange={refetch}
              autoOpen={autoOpenTreatment}
              prefill={treatmentPrefill}
            />
          )}
        </div>
      </div>

      {showEdit && (
        <PatientFormModal
          patient={patient}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); refetch(); }}
        />
      )}
    </div>
  );
}

function Detail({ label, value, mono, href }: { label: string; value: string; mono?: boolean; href?: string }) {
  const content = href ? (
    <a href={href} className={`text-sm text-sky-600 hover:underline ${mono ? "font-mono" : ""}`} dir="ltr">
      {value}
    </a>
  ) : (
    <span className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</span>
  );
  return (
    <div className="py-2 border-b border-gray-50 last:border-0 sm:flex sm:gap-3">
      <span className="block text-xs text-gray-400 mb-0.5 sm:hidden">{label}</span>
      <span className="hidden sm:block text-sm text-gray-500 w-32 shrink-0">{label}</span>
      {content}
    </div>
  );
}
