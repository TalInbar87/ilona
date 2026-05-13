import { useState, useEffect } from "react";
import { Upload, Paperclip } from "lucide-react";
import { supabase, STORAGE_BUCKETS } from "../../lib/supabase";
import { FileItem } from "../files/FileItem";
import type { PatientFile } from "../../types";

interface Props {
  patientId: string;
}

export function PatientFilesSection({ patientId }: Props) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadFiles = async () => {
    const { data } = await supabase
      .from("patient_files")
      .select("*")
      .eq("patient_id", patientId)
      .is("diagnosis_id", null)
      .is("hearing_test_id", null)
      .order("uploaded_at");
    setFiles((data ?? []) as PatientFile[]);
  };

  useEffect(() => { loadFiles(); }, [patientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const ext = file.name.split(".").pop() ?? "bin";
    const mime = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");
    const storagePath = `${patientId}/general/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKETS.PATIENT_FILES)
      .upload(storagePath, file, { contentType: mime });
    if (uploadErr) {
      setUploadError(uploadErr.message);
    } else {
      await supabase.from("patient_files").insert({
        patient_id: patientId,
        file_name: file.name,
        storage_path: storagePath,
        mime_type: mime,
        file_size: file.size,
      });
      loadFiles();
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="pt-4 border-t border-gray-100 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="w-4 h-4 text-sky-600" />
        <h3 className="text-sm font-semibold text-gray-700">קבצים מצורפים</h3>
      </div>

      {files.length > 0 && (
        <div className="space-y-1 mb-3">
          {files.map((f) => (
            <FileItem key={f.id} file={f} bucket="PATIENT_FILES" onDeleted={loadFiles} />
          ))}
        </div>
      )}

      {uploadError && <p className="text-xs text-red-500 mb-2">{uploadError}</p>}

      <label
        className={`flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Upload className="w-3.5 h-3.5" />
        {uploading ? "מעלה..." : "העלאת קובץ"}
        <input type="file" className="hidden" accept=".pdf,image/*,.doc,.docx" onChange={handleUpload} />
      </label>
    </div>
  );
}
