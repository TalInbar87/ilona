import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Supervisee } from "../../types";

interface Props {
  supervisee?: Supervisee;
  onClose: () => void;
  onSaved: () => void;
}

export function SuperviseeFormModal({ supervisee, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    full_name: supervisee?.full_name ?? "",
    phone: supervisee?.phone ?? "",
    email: supervisee?.email ?? "",
    notes: supervisee?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("שם מלא הוא שדה חובה"); return; }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error: err } = supervisee
      ? await supabase.from("supervisees").update(payload).eq("id", supervisee.id)
      : await supabase.from("supervisees").insert(payload);

    if (err) { setError(err.message); setSaving(false); }
    else onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {supervisee ? "עריכת מודרכת" : "מודרכת חדשה"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="label-base">שם מלא *</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-base" placeholder="שם המודרכת" />
          </div>
          <div>
            <label className="label-base">טלפון</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-base" dir="ltr" placeholder="050-0000000" />
          </div>
          <div>
            <label className="label-base">אימייל</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-base" dir="ltr" placeholder="email@example.com" />
          </div>
          <div>
            <label className="label-base">הערות</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-base resize-none" rows={3} placeholder="הערות נוספות..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? "שומר..." : "שמירה"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}
