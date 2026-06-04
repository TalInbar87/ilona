import { useRef } from "react";
import { Upload, Trash2, Loader2, Image as ImageIcon, ShieldAlert } from "lucide-react";
import { useUserAssets } from "../hooks/useUserAssets";

// ─── Shared upload area component ───────────────────────────────────────────

interface AssetUploaderProps {
  label: string;
  previewUrl: string | null;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
}

function AssetUploader({ label, previewUrl, uploading, onUpload, onDelete }: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    await onUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
      // Reset so same file can be re-uploaded
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt={label}
            className="max-h-32 max-w-xs rounded-lg border border-gray-200 object-contain bg-white shadow-sm"
          />
          <button
            onClick={onDelete}
            disabled={uploading}
            className="absolute -top-2 -left-2 p-1 bg-white border border-red-200 rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
            title="מחיקה"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-sky-300 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
          ) : (
            <>
              <div className="p-2 bg-sky-50 rounded-full">
                <Upload className="w-5 h-5 text-sky-500" />
              </div>
              <p className="text-sm text-gray-500">גרור לכאן או לחץ להעלאה</p>
            </>
          )}
        </div>
      )}

      {!previewUrl && (
        <button
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4" />
          {uploading ? "מעלה..." : "בחר תמונה"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      <p className="text-xs text-gray-400">פורמטים: JPG, PNG, WebP · גודל מקסימלי: 5MB</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const {
    signatureUrl,
    logoUrl,
    uploading,
    uploadSignature,
    uploadLogo,
    deleteSignature,
    deleteLogo,
  } = useUserAssets();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">המשתמש שלי</h1>

      {/* ── Logo section ─────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">לוגו אישי</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            הלוגו יוצג בראש הסרגל הצדדי במקום הסמל הכחול.
          </p>
        </div>

        <div className="flex items-start gap-2.5 p-3.5 bg-sky-50 border border-sky-200 rounded-lg">
          <ImageIcon className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-sm text-sky-800 leading-relaxed">
            הלוגו יוצג בגודלו הטבעי בסרגל. לתצוגה חדה מומלץ להעלות תמונה ברזולוציה גבוהה (לפחות 300×300 פיקסלים). PNG עם רקע שקוף עובד הכי טוב.
          </p>
        </div>

        <AssetUploader
          label="לוגו אישי"
          previewUrl={logoUrl}
          uploading={uploading}
          onUpload={uploadLogo}
          onDelete={deleteLogo}
        />
      </div>

      {/* ── Signature section ─────────────────────────────────────── */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">חתימה אישית</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            החתימה תשמש בדוחות וסיכומי טיפול.
          </p>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-relaxed">
            החתימה מאוחסנת בצורה מוצפנת ומאובטחת. רק את/ה יכול/ה לגשת אליה. אין לשתף גישה לחשבון עם אחרים.
          </p>
        </div>

        <AssetUploader
          label="חתימה אישית"
          previewUrl={signatureUrl}
          uploading={uploading}
          onUpload={uploadSignature}
          onDelete={deleteSignature}
        />
      </div>
    </div>
  );
}
