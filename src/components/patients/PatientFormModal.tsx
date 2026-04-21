import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { validateIsraeliId, calcAge } from "../../lib/utils";
import type { PatientWithStats } from "../../types";

interface Props {
  patient?: PatientWithStats;
  onClose: () => void;
  onSaved: () => void;
}

export function PatientFormModal({ patient, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    full_name: patient?.full_name ?? "",
    date_of_birth: patient?.date_of_birth ?? "",
    id_number: patient?.id_number ?? "",
    phone: patient?.phone ?? "",
    parent_name: patient?.parent_name ?? "",
    notes: patient?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "שם מלא הוא שדה חובה";
    if (!form.date_of_birth) e.date_of_birth = "תאריך לידה הוא שדה חובה";
    if (!form.id_number.trim()) {
      e.id_number = "ת.ז. הוא שדה חובה";
    } else if (!validateIsraeliId(form.id_number)) {
      e.id_number = "ת.ז. לא תקינה";
    }
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      date_of_birth: form.date_of_birth,
      id_number: form.id_number.trim(),
      phone: form.phone.trim() || null,
      parent_name: form.parent_name.trim() || null,
      notes: form.notes.trim() || null,
    };

    const { error } = patient
      ? await supabase.from("patients").update(payload).eq("id", patient.id)
      : await supabase.from("patients").insert(payload);

    if (error) {
      if (error.message.includes("id_number")) {
        setErrors({ id_number: "ת.ז. זו כבר קיימת במערכת" });
      } else {
        setErrors({ general: error.message });
      }
      setSaving(false);
    } else {
      onSaved();
    }
  };

  const age = form.date_of_birth ? calcAge(form.date_of_birth) : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {patient ? "עריכת מטופל" : "מטופל חדש"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errors.general && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{errors.general}</p>
          )}

          <div>
            <label className="label-base">שם מלא *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input-base"
              placeholder="ישראל ישראלי"
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">תאריך לידה *</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="input-base"
                max={new Date().toISOString().split("T")[0]}
              />
              {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>}
            </div>
            <div>
              <label className="label-base">גיל</label>
              <div className="input-base bg-gray-50 text-gray-500">
                {age !== null ? `${age} שנים` : "—"}
              </div>
            </div>
          </div>

          <div>
            <label className="label-base">מספר ת.ז. *</label>
            <input
              type="text"
              value={form.id_number}
              onChange={(e) => setForm({ ...form, id_number: e.target.value.replace(/\D/g, "").slice(0, 9) })}
              className="input-base font-mono"
              placeholder="123456789"
              maxLength={9}
              dir="ltr"
            />
            {errors.id_number && <p className="text-red-500 text-xs mt-1">{errors.id_number}</p>}
          </div>

          <div>
            <label className="label-base">טלפון</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-base"
              placeholder="050-0000000"
              dir="ltr"
            />
          </div>

          <div>
            <label className="label-base">שם הורה / ממונה</label>
            <input
              type="text"
              value={form.parent_name}
              onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
              className="input-base"
              placeholder="שם ההורה (לילדים)"
            />
          </div>

          <div>
            <label className="label-base">הערות כלליות</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-base resize-none"
              rows={3}
              placeholder="הערות נוספות..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "שומר..." : "שמירה"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
