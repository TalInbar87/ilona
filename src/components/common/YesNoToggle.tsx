interface Props {
  value: boolean | null;
  onChange: (v: boolean) => void;
}

export function YesNoToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          value === true
            ? "bg-emerald-500 text-white border-emerald-500"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
        }`}
      >
        כן
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          value === false
            ? "bg-red-500 text-white border-red-500"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
        }`}
      >
        לא
      </button>
    </div>
  );
}
