import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  User,
  Phone,
  Hash,
  Calendar,
  Pencil,
  Activity,
} from "lucide-react";
import { usePatient } from "../hooks/usePatient";
import { calcAge, formatDate } from "../lib/utils";
import { PatientFormModal } from "../components/patients/PatientFormModal";
import { DiagnosesTab } from "../components/diagnoses/DiagnosesTab";
import { TreatmentsTab } from "../components/treatments/TreatmentsTab";

type Tab = "details" | "diagnoses" | "treatments";

export function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { data: patient, loading, error, refetch } = usePatient(patientId);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [showEdit, setShowEdit] = useState(false);

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
    { id: "diagnoses" as Tab, label: "אבחונים וסיכומים" },
    { id: "treatments" as Tab, label: "תיק טיפול" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/patients")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        חזרה למטופלים
      </button>

      {/* Patient Header Card */}
      <div className="card p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-sky-100 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-sky-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{patient.full_name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  {patient.id_number}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(patient.date_of_birth)} ({calcAge(patient.date_of_birth)} שנים)
                </span>
                {patient.phone && (
                  <span className="flex items-center gap-1" dir="ltr">
                    <Phone className="w-3.5 h-3.5" />
                    {patient.phone}
                  </span>
                )}
                {patient.parent_name && (
                  <span className="text-gray-400">הורה: {patient.parent_name}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Treatment count badge */}
            <div className="flex items-center gap-1.5 bg-sky-50 text-sky-700 px-3 py-1.5 rounded-xl">
              <Activity className="w-4 h-4" />
              <span className="font-semibold text-sm">{patient.treatment_count}</span>
              <span className="text-xs">טיפולים</span>
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
              עריכה
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
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
              <Detail label="גיל" value={`${calcAge(patient.date_of_birth)} שנים`} />
              {patient.phone && <Detail label="טלפון" value={patient.phone} />}
              {patient.parent_name && <Detail label="שם הורה" value={patient.parent_name} />}
              {patient.notes && <Detail label="הערות" value={patient.notes} />}
            </div>
          )}
          {activeTab === "diagnoses" && (
            <DiagnosesTab patientId={patient.id} />
          )}
          {activeTab === "treatments" && (
            <TreatmentsTab patientId={patient.id} onTreatmentCountChange={refetch} />
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

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
