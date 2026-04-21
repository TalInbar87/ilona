import { useState } from "react";
import { supabase, STORAGE_BUCKETS } from "../lib/supabase";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

interface UploadOptions {
  bucket: keyof typeof STORAGE_BUCKETS;
  pathPrefix: string;
  onSuccess: (result: { path: string; name: string; size: number; mime: string }) => void;
}

export function useFileUpload({ bucket, pathPrefix, onSuccess }: UploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploadError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("סוג קובץ לא נתמך. יש להעלות PDF או תמונה.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("הקובץ גדול מדי. גודל מקסימלי: 20MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS[bucket])
      .upload(path, file);

    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }

    onSuccess({ path, name: file.name, size: file.size, mime: file.type });
    setUploading(false);
  };

  return { upload, uploading, uploadError };
}
