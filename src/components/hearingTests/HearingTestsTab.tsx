import { useState } from "react";
import { Plus, Ear, Pencil, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useHearingTests } from "../../hooks/useHearingTests";
import { supabase } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import type { HearingTest } from "../../types";

interface Props {
  patientId: string;
}

const emptyForm = () => ({ test_date: "", results: "", notes: "" });

export function HearingTestsTab({ patientId }: Props) {
  const { data: tests, loading, refetch } = useHearingTests(patientId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("hearing_tests").insert({
      patient_id: patientId,
      test_date: form.test_date || null,
      results: form.results.trim() || null,
      notes: form.notes.trim() || null,
    });
    setForm(emptyForm());
    setShowForm(false);
    setSaving(false);
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Ear className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-gray-700">בדיקות שמיעה</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          הוספת בדיקה
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <HearingTestForm
          form={form}
          setForm={setForm}
          onSubmit={handleAdd}
          onCancel={() => { setShowForm(false); setForm(emptyForm()); }}
          saving={saving}
          submitLabel="הוספה"
        />
      )}

      {/* List */}
      {tests.length === 0 && !showForm ? (
        <div className="text-center py-10 text-gray-400">
          <Ear className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">אין בדיקות שמיעה עדיין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <HearingTestCard key={t.id} test={t} onRefetch={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared form ───────────────────────────────────────────────────────────────
function HearingTestForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
  bgClass = "bg-sky-50 border border-sky-200",
}: {
  form: { test_date: string; results: string; notes: string };
  setForm: (f: { test_date: string; results: string; notes: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  bgClass?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={`${bgClass} rounded-xl p-4 space-y-3`}>
      <div>
        <label className="label-base text-xs">תאריך הבדיקה</label>
        <input
          type="date"
          value={form.test_date}
          onChange={(e) => setForm({ ...form, test_date: e.target.value })}
          className="input-base text-sm"
          max={new Date().toISOString().split("T")[0]}
        />
      </div>
      <div>
        <label className="label-base text-xs">תוצאות הבדיקה</label>
        <textarea
          autoFocus
          value={form.results}
          onChange={(e) => setForm({ ...form, results: e.target.value })}
          className="input-base text-sm resize-none"
          rows={3}
          placeholder="תאר את תוצאות הבדיקה..."
        />
      </div>
      <div>
        <label className="label-base text-xs">הערות</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input-base text-sm resize-none"
          rows={2}
          placeholder="הערות נוספות..."
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary text-xs py-1.5 px-3 disabled:opacity-60 flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? "שומר..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-3">
          ביטול
        </button>
      </div>
    </form>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function HearingTestCard({ test, onRefetch }: { test: HearingTest; onRefetch: () => void }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editForm, setEditForm] = useState({
    test_date: test.test_date ?? "",
    results: test.results ?? "",
    notes: test.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("hearing_tests").update({
      test_date: editForm.test_date || null,
      results: editForm.results.trim() || null,
      notes: editForm.notes.trim() || null,
    }).eq("id", test.id);
    setSaving(false);
    setEditing(false);
    onRefetch();
  };

  const handleDelete = async () => {
    if (!confirm("למחוק את בדיקת השמיעה?")) return;
    await supabase.from("hearing_tests").delete().eq("id", test.id);
    onRefetch();
  };

  const startEdit = () => {
    setEditForm({
      test_date: test.test_date ?? "",
      results: test.results ?? "",
      notes: test.notes ?? "",
    });
    setEditing(true);
    setExpanded(true);
  };

  if (editing) {
    return (
      <HearingTestForm
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleSave}
        onCancel={() => setEditing(false)}
        saving={saving}
        submitLabel="שמירה"
        bgClass="bg-amber-50 border border-amber-200"
      />
    );
  }

  const hasDetails = !!(test.results || test.notes);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Ear className="w-4 h-4 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800">
            {test.test_date ? formatDate(test.test_date) : "ללא תאריך"}
          </span>
          {!expanded && test.results && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{test.results}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-gray-500 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={startEdit}
            className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-300 hover:text-amber-500 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-50 pt-2">
          {test.results && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">תוצאות</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{test.results}</p>
            </div>
          )}
          {test.notes && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-0.5">הערות</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{test.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
