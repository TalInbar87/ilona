import { useState } from "react";
import { FileText, ArrowLeftRight } from "lucide-react";
import { ReportModal } from "./ReportModal";
import type { ReportType } from "../../lib/generateReport";
import type { PatientWithStats } from "../../types";

interface Props {
  patient: PatientWithStats;
}

export function ReportsTab({ patient }: Props) {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);

  const cards: { type: ReportType; title: string; description: string; icon: React.ReactNode }[] = [
    {
      type: "summary",
      title: "סיכום טיפול",
      description: "מסמך סיכום לסיום מהלך טיפול — כולל רקע, מטרות, התקדמות וסיכום",
      icon: <FileText className="w-6 h-6 text-sky-600" />,
    },
    {
      type: "continuation",
      title: "בקשה להמשך טיפול",
      description: "מסמך לגורם מפנה לצורך המשך טיפול — כולל רקע, מטרות, התקדמות וסיכום",
      icon: <ArrowLeftRight className="w-6 h-6 text-violet-600" />,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">בחר סוג דוח ליצירת מסמך Word להורדה</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <button
            key={card.type}
            onClick={() => setActiveReport(card.type)}
            className="text-right p-5 rounded-2xl border-2 border-gray-100 hover:border-sky-200 hover:bg-sky-50/40 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{card.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{card.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {activeReport && (
        <ReportModal
          patient={patient}
          reportType={activeReport}
          onClose={() => setActiveReport(null)}
        />
      )}
    </div>
  );
}
