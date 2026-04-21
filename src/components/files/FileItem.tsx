import { Download, Trash2, FileText, ImageIcon, File } from "lucide-react";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { formatFileSize, getFileIcon } from "../../lib/utils";
import type { PatientFile, TreatmentFile } from "../../types";

type AnyFile = (PatientFile | TreatmentFile) & { file_size?: number | null };

interface Props {
  file: AnyFile;
  bucket: keyof typeof STORAGE_BUCKETS;
  onDeleted: () => void;
}

export function FileItem({ file, bucket, onDeleted }: Props) {
  const iconType = getFileIcon(file.mime_type);

  const handleDownload = async () => {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .createSignedUrl(file.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async () => {
    if (!confirm(`למחוק את "${file.file_name}"?`)) return;
    await supabase.storage.from(STORAGE_BUCKETS[bucket]).remove([file.storage_path]);
    if ("diagnosis_id" in file) {
      await supabase.from("patient_files").delete().eq("id", file.id);
    } else {
      await supabase.from("treatment_files").delete().eq("id", file.id);
    }
    onDeleted();
  };

  const Icon =
    iconType === "pdf" ? FileText : iconType === "image" ? ImageIcon : File;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-700 flex-1 truncate">{file.file_name}</span>
      {file.file_size && (
        <span className="text-xs text-gray-400">{formatFileSize(file.file_size)}</span>
      )}
      <button
        onClick={handleDownload}
        className="p-1 hover:bg-sky-50 rounded text-gray-300 hover:text-sky-600 transition-colors opacity-0 group-hover:opacity-100"
        title="הורדה"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleDelete}
        className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        title="מחיקה"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
