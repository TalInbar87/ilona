import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

const BUCKET = "user-assets";
const SIGNED_URL_TTL = 3600; // seconds

interface UserAssetsState {
  signatureUrl: string | null;
  logoUrl: string | null;
  signaturePath: string | null;
  logoPath: string | null;
  uploading: boolean;
}

interface UseUserAssetsReturn extends UserAssetsState {
  uploadSignature: (file: File) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  deleteSignature: () => Promise<void>;
  deleteLogo: () => Promise<void>;
  refresh: () => Promise<void>;
}

async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function useUserAssets(): UseUserAssetsReturn {
  const user = useAuthStore((s) => s.user);
  const setLogoUrl = useAuthStore((s) => s.setLogoUrl);

  const [state, setState] = useState<UserAssetsState>({
    signatureUrl: null,
    logoUrl: null,
    signaturePath: null,
    logoPath: null,
    uploading: false,
  });

  const refresh = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("signature_path, logo_path")
      .eq("id", user.id)
      .single();

    if (error || !data) return;

    const signaturePath = data.signature_path ?? null;
    const logoPath = data.logo_path ?? null;

    const [signatureUrl, logoUrl] = await Promise.all([
      signaturePath ? getSignedUrl(signaturePath) : Promise.resolve(null),
      logoPath ? getSignedUrl(logoPath) : Promise.resolve(null),
    ]);

    setState({ signatureUrl, logoUrl, signaturePath, logoPath, uploading: false });

    // Keep authStore in sync for AppShell logo display
    setLogoUrl(logoUrl);
  }, [user, setLogoUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadSignature = async (file: File) => {
    if (!user) return;
    setState((prev) => ({ ...prev, uploading: true }));

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/signature.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setState((prev) => ({ ...prev, uploading: false }));
      throw uploadError;
    }

    await supabase
      .from("profiles")
      .update({ signature_path: path })
      .eq("id", user.id);

    await refresh();
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    setState((prev) => ({ ...prev, uploading: true }));

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setState((prev) => ({ ...prev, uploading: false }));
      throw uploadError;
    }

    await supabase
      .from("profiles")
      .update({ logo_path: path })
      .eq("id", user.id);

    await refresh();
  };

  const deleteSignature = async () => {
    if (!user || !state.signaturePath) return;
    setState((prev) => ({ ...prev, uploading: true }));

    await supabase.storage.from(BUCKET).remove([state.signaturePath]);
    await supabase
      .from("profiles")
      .update({ signature_path: null })
      .eq("id", user.id);

    await refresh();
  };

  const deleteLogo = async () => {
    if (!user || !state.logoPath) return;
    setState((prev) => ({ ...prev, uploading: true }));

    await supabase.storage.from(BUCKET).remove([state.logoPath]);
    await supabase
      .from("profiles")
      .update({ logo_path: null })
      .eq("id", user.id);

    await refresh();
  };

  return {
    ...state,
    uploadSignature,
    uploadLogo,
    deleteSignature,
    deleteLogo,
    refresh,
  };
}
