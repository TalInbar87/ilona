import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const USER_ASSETS_BUCKET = "user-assets";
const SIGNED_URL_TTL = 3600;

interface AuthState {
  session: Session | null;
  user: User | null;
  isSuperuser: boolean;
  forcePasswordChange: boolean; // true = user must change password before using the app
  loading: boolean;          // auth session loading — controls ProtectedRoute spinner
  superuserLoading: boolean; // profile loading — controls UsersPage redirect guard
  firstName: string | null;
  lastName: string | null;
  logoUrl: string | null;
  logoPath: string | null;
  init: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setLogoUrl: (url: string | null) => void;
}

interface ProfileData {
  is_superuser: boolean;
  first_name: string | null;
  last_name: string | null;
  logo_path: string | null;
  logo_url: string | null;
}

async function resolveSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(USER_ASSETS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Never throws, never hangs — resolves within 5 s at most. */
async function fetchProfile(userId: string): Promise<ProfileData> {
  return new Promise((resolve) => {
    const fallback: ProfileData = { is_superuser: false, first_name: null, last_name: null, logo_path: null, logo_url: null };
    const timer = setTimeout(() => resolve(fallback), 5000);
    supabase
      .from("profiles")
      .select("is_superuser, first_name, last_name, logo_path")
      .eq("id", userId)
      .single()
      .then(async ({ data, error }) => {
        clearTimeout(timer);
        if (error || !data) { resolve(fallback); return; }
        const logo_path = data.logo_path ?? null;
        const logo_url = await resolveSignedUrl(logo_path);
        resolve({
          is_superuser: data.is_superuser ?? false,
          first_name: data.first_name ?? null,
          last_name: data.last_name ?? null,
          logo_path,
          logo_url,
        });
      }, () => { clearTimeout(timer); resolve(fallback); });
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isSuperuser: false,
  forcePasswordChange: false,
  loading: true,
  superuserLoading: true,
  firstName: null,
  lastName: null,
  logoUrl: null,
  logoPath: null,

  setLogoUrl: (url) => set({ logoUrl: url }),

  init: () => {
    // ── Initial session ──────────────────────────────────────────────────────
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        set({
          session,
          user: session?.user ?? null,
          forcePasswordChange: session?.user?.app_metadata?.force_password_change ?? false,
          loading: false,
        });

        if (session?.user) {
          fetchProfile(session.user.id).then(({ is_superuser, first_name, last_name, logo_path, logo_url }) => {
            set({ isSuperuser: is_superuser, firstName: first_name, lastName: last_name, logoPath: logo_path, logoUrl: logo_url, superuserLoading: false });
          });
        } else {
          set({ superuserLoading: false });
        }
      })
      .catch(() => set({ loading: false, superuserLoading: false }));

    // ── Auth state changes (login / logout / token refresh) ──────────────────
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        forcePasswordChange: session?.user?.app_metadata?.force_password_change ?? false,
        loading: false,
        isSuperuser: false,
        firstName: null,
        lastName: null,
        logoUrl: null,
        logoPath: null,
        superuserLoading: !!session?.user,
      });

      if (session?.user) {
        fetchProfile(session.user.id).then(({ is_superuser, first_name, last_name, logo_path, logo_url }) => {
          set({ isSuperuser: is_superuser, firstName: first_name, lastName: last_name, logoPath: logo_path, logoUrl: logo_url, superuserLoading: false });
        });
      }
    });
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { first_name, last_name, is_superuser, logo_path, logo_url } = await fetchProfile(user.id);
    set({ firstName: first_name, lastName: last_name, isSuperuser: is_superuser, logoPath: logo_path, logoUrl: logo_url });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isSuperuser: false, forcePasswordChange: false,
          firstName: null, lastName: null, logoUrl: null, logoPath: null, superuserLoading: false });
  },
}));
