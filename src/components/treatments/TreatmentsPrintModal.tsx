import { useEffect, useState } from "react";
import { X, Printer, CheckSquare, Square, Wrench, Lightbulb, ClipboardList } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import type { Treatment } from "../../types";

interface TreatmentGoal {
  id: string;
  text: string;
  done: boolean;
}

interface TreatmentWithGoals extends Treatment {
  goals: TreatmentGoal[];
}

interface Props {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

export function TreatmentsPrintModal({ patientId, patientName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<TreatmentWithGoals[]>([]);

  const today = formatDate(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const load = async () => {
      const { data: rows } = await supabase
        .from("treatments")
        .select("*")
        .eq("patient_id", patientId)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!rows || rows.length === 0) {
        setLoading(false);
        return;
      }

      const ids = rows.map(r => r.id);
      const { data: tgRows } = await supabase
        .from("treatment_goals")
        .select("treatment_id, patient_goals!goal_id(id, text, done)")
        .in("treatment_id", ids);

      // Build map: treatmentId → goals[]
      const goalsMap: Record<string, TreatmentGoal[]> = {};
      for (const row of tgRows ?? []) {
        const pg = row.patient_goals as TreatmentGoal | null;
        if (!pg) continue;
        if (!goalsMap[row.treatment_id]) goalsMap[row.treatment_id] = [];
        goalsMap[row.treatment_id].push(pg);
      }

      setTreatments(rows.map(t => ({ ...t, goals: goalsMap[t.id] ?? [] })));
      setLoading(false);
    };
    load();
  }, [patientId]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .treatments-print-root,
          .treatments-print-root * { visibility: visible; }
          .treatments-print-root { position: absolute; top: 0; right: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          .treatment-block { page-break-inside: avoid; }
        }
      `}</style>

      {/* Backdrop */}
      <div className="no-print fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Container */}
      <div className="treatments-print-root fixed inset-0 z-50 overflow-y-auto">
        <div className="flex flex-col items-center min-h-full p-4 py-6">

          {/* Toolbar — hidden in print */}
          <div className="no-print sticky top-2 z-10 flex items-center justify-between bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-2.5 w-full max-w-2xl mb-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <ClipboardList className="w-4 h-4 text-sky-500" />
              {patientName} — תיק טיפול
              {!loading && (
                <span className="font-normal text-gray-400">({treatments.length} פגישות)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                disabled={loading}
                className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-sm disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                הדפס / PDF
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Document */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-2xl p-6 md:p-8">

            {/* Document header */}
            <div className="mb-6 pb-4 border-b-2 border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">{patientName}</h1>
              <p className="text-sm text-gray-400 mt-1">תיק טיפול · הופק ב-{today}</p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : treatments.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">אין טיפולים מתועדים</p>
            ) : (
              <div className="space-y-0">
                {treatments.map((t, idx) => (
                  <TreatmentBlock
                    key={t.id}
                    treatment={t}
                    number={treatments.length - idx}
                    isLast={idx === treatments.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

function TreatmentBlock({
  treatment: t,
  number,
  isLast,
}: {
  treatment: TreatmentWithGoals;
  number: number;
  isLast: boolean;
}) {
  const activeGoals = t.goals.filter(g => !g.done);
  const doneGoals   = t.goals.filter(g => g.done);

  const meta: string[] = [];
  if (t.session_time) meta.push(t.session_time.slice(0, 5));
  if (t.duration_min) meta.push(`${t.duration_min} דקות`);

  return (
    <div className={`treatment-block py-5 ${!isLast ? "border-b border-gray-100" : ""}`}>
      {/* Treatment header */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-xs font-bold text-sky-600 bg-sky-50 rounded px-1.5 py-0.5 shrink-0">
          #{number}
        </span>
        <h2 className="text-base font-bold text-gray-900">
          {formatDate(t.session_date)}
        </h2>
        {meta.length > 0 && (
          <span className="text-sm text-gray-400">{meta.join(" · ")}</span>
        )}
      </div>

      <div className="space-y-3 pr-1">
        {/* Goals */}
        {t.goals.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
              מטרות טיפול
            </p>
            {activeGoals.length > 0 && (
              <ul className="space-y-1 mb-1">
                {activeGoals.map(g => (
                  <li key={g.id} className="flex items-start gap-2 text-sm text-gray-700">
                    <Square className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                    {g.text}
                  </li>
                ))}
              </ul>
            )}
            {doneGoals.length > 0 && (
              <ul className="space-y-1">
                {doneGoals.map(g => (
                  <li key={g.id} className="flex items-start gap-2 text-sm text-gray-400 line-through">
                    <CheckSquare className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    {g.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Tools */}
        {t.tools && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-violet-400" />
              עזרים לטיפול
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{t.tools}</p>
          </div>
        )}

        {/* Notes */}
        {t.notes && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">תיעוד מפורט</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{t.notes}</p>
          </div>
        )}

        {/* Next ideas */}
        {t.next_ideas && (
          <div className="border-r-2 border-amber-300 pr-3">
            <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5" />
              תכנון טיפול הבא
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{t.next_ideas}</p>
          </div>
        )}

        {/* Empty treatment */}
        {!t.notes && !t.tools && !t.next_ideas && t.goals.length === 0 && (
          <p className="text-sm text-gray-400">אין פרטים נוספים לטיפול זה</p>
        )}
      </div>
    </div>
  );
}
