import { Clock } from "lucide-react";

interface Props {
  secondsLeft: number;
  onContinue: () => void;
  onSignOut: () => void;
}

export function IdleTimeoutModal({ secondsLeft, onContinue, onSignOut }: Props) {
  const isUrgent = secondsLeft <= 15;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        {/* Icon + countdown ring */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isUrgent ? "bg-red-100" : "bg-amber-100"
          }`}>
            <Clock className={`w-7 h-7 ${isUrgent ? "text-red-500" : "text-amber-500"}`} />
          </div>
          {/* Countdown badge */}
          <span className={`absolute -bottom-1 -left-1 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center text-white ${
            isUrgent ? "bg-red-500" : "bg-amber-500"
          }`}>
            {secondsLeft}
          </span>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-1">לא זוהתה פעילות</h2>
        <p className="text-sm text-gray-500 mb-5">
          המערכת תתנתק אוטומטית בעוד{" "}
          <span className={`font-semibold ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
            {secondsLeft} שניות
          </span>
          {" "}לשמירה על פרטיות המטופלים.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onContinue}
            className="btn-primary flex-1"
            autoFocus
          >
            המשך עבודה
          </button>
          <button
            onClick={onSignOut}
            className="btn-secondary flex-1"
          >
            התנתקות
          </button>
        </div>
      </div>
    </div>
  );
}
