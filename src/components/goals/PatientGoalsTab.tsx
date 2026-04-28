import { Target, CheckSquare, Square, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { GoalPicker } from "./GoalPicker";
import { usePatientGoals } from "../../hooks/usePatientGoals";
import type { PatientGoal } from "../../types";

interface Props {
  patientId: string;
}

export function PatientGoalsTab({ patientId }: Props) {
  const { data: goals, loading, refetch } = usePatientGoals(patientId);

  const handleAdd = async (text: string, categoryId?: string | null) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await supabase
      .from("patient_goals")
      .upsert(
        { patient_id: patientId, text: trimmed, done: false, sort_order: goals.length * 10, category_id: categoryId ?? null },
        { onConflict: "patient_id,text", ignoreDuplicates: true }
      );
    refetch();
  };

  const handleToggle = async (goal: PatientGoal) => {
    await supabase
      .from("patient_goals")
      .update({ done: !goal.done })
      .eq("id", goal.id);
    refetch();
  };

  const handleDelete = async (goal: PatientGoal) => {
    if (!confirm(`למחוק את המטרה "${goal.text}"?`)) return;
    await supabase.from("patient_goals").delete().eq("id", goal.id);
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const active = goals.filter(g => !g.done);
  const done   = goals.filter(g => g.done);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-sky-500" />
        <span className="text-sm font-semibold text-gray-700">
          מטרות טיפול {goals.length > 0 && `(${goals.length})`}
        </span>
      </div>

      {/* Add */}
      <GoalPicker onAdd={handleAdd} colorScheme="sky" />

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Target className="w-10 h-10 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">אין מטרות עדיין — הוסף את הראשונה</p>
        </div>
      )}

      {/* Active goals */}
      {active.length > 0 && (
        <ul className="space-y-1">
          {active.map(g => (
            <GoalRow key={g.id} goal={g} onToggle={() => handleToggle(g)} onDelete={() => handleDelete(g)} />
          ))}
        </ul>
      )}

      {/* Completed goals */}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1.5">🏅 הושלמו ({done.length})</p>
          <ul className="space-y-1">
            {done.map(g => (
              <GoalRow key={g.id} goal={g} onToggle={() => handleToggle(g)} onDelete={() => handleDelete(g)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GoalRow({
  goal, onToggle, onDelete,
}: {
  goal: PatientGoal;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 group px-1 py-1 rounded-lg hover:bg-gray-50 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 text-gray-400 hover:text-sky-600 transition-colors"
      >
        {goal.done
          ? <CheckSquare className="w-4 h-4 text-sky-500" />
          : <Square className="w-4 h-4" />}
      </button>
      <span className={`text-sm flex-1 ${goal.done ? "line-through text-gray-400" : "text-gray-700"}`}>
        {goal.text}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
