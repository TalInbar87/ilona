import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  isSuperuser: boolean;
  forcePasswordChange: boolean; // true = user must change password before using the app
  loading: boolean;          // auth session loading — controls ProtectedRoute spinner
  superuserLoading: boolean; // profile loading — controls UsersPage redirect guard
  firstName: string | null;
  lastName: string | null;
  init: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface ProfileData { is_superuser: boolean; first_name: string | null; last_name: string | null; }

/** Never throws, never hangs — resolves within 5 s at most. */
async function fetchProfile(userId: string): Promise<ProfileData> {
  return new Promise((resolve) => {
    const fallback = { is_superuser: false, first_name: null, last_name: null };
    const timer = setTimeout(() => resolve(fallback), 5000);
    supabase
      .from("profiles")
      .select("is_superuser, first_name, last_name")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        clearTimeout(timer);
        resolve(error ? fallback : {
          is_superuser: data?.is_superuser ?? false,
          first_name: data?.first_name ?? null,
          last_name: data?.last_name ?? null,
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
          fetchProfile(session.user.id).then(({ is_superuser, first_name, last_name }) => {
            set({ isSuperuser: is_superuser, firstName: first_name, lastName: last_name, superuserLoading: false });
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
        superuserLoading: !!session?.user,
      });

      if (session?.user) {
        fetchProfile(session.user.id).then(({ is_superuser, first_name, last_name }) => {
          set({ isSuperuser: is_superuser, firstName: first_name, lastName: last_name, superuserLoading: false });
        });
      }
    });
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { first_name, last_name, is_superuser } = await fetchProfile(user.id);
    set({ firstName: first_name, lastName: last_name, isSuperuser: is_superuser });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isSuperuser: false, forcePasswordChange: false,
          firstName: null, lastName: null, superuserLoading: false });
  },
}));
