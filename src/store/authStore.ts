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
  init: () => void;
  signOut: () => Promise<void>;
}

/** Never throws, never hangs — resolves within 5 s at most. */
async function fetchIsSuperuser(userId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 5000);
    supabase
      .from("profiles")
      .select("is_superuser")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        clearTimeout(timer);
        resolve(error ? false : (data?.is_superuser ?? false));
      }, () => { clearTimeout(timer); resolve(false); });
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isSuperuser: false,
  forcePasswordChange: false,
  loading: true,
  superuserLoading: true,

  init: () => {
    // ── Initial session ──────────────────────────────────────────────────────
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        // Set loading:false immediately — app is unblocked
        set({
          session,
          user: session?.user ?? null,
          forcePasswordChange: session?.user?.app_metadata?.force_password_change ?? false,
          loading: false,
        });

        // Fetch superuser status separately (non-blocking for ProtectedRoute)
        if (session?.user) {
          fetchIsSuperuser(session.user.id).then((isSuperuser) => {
            set({ isSuperuser, superuserLoading: false });
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
        superuserLoading: !!session?.user,
      });

      if (session?.user) {
        fetchIsSuperuser(session.user.id).then((isSuperuser) => {
          set({ isSuperuser, superuserLoading: false });
        });
      }
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isSuperuser: false, forcePasswordChange: false, superuserLoading: false });
  },
}));
