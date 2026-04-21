import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  isSuperuser: boolean;
  loading: boolean;
  init: () => void;
  signOut: () => Promise<void>;
}

async function fetchIsSuperuser(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_superuser")
      .eq("id", userId)
      .single();
    if (error) return false;
    return data?.is_superuser ?? false;
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isSuperuser: false,
  loading: true,

  init: () => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        // Always set loading:false — even if profile fetch fails
        const isSuperuser = session?.user
          ? await fetchIsSuperuser(session.user.id)
          : false;
        set({ session, user: session?.user ?? null, isSuperuser, loading: false });
      })
      .catch(() => {
        set({ loading: false });
      });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const isSuperuser = session?.user
        ? await fetchIsSuperuser(session.user.id)
        : false;
      set({ session, user: session?.user ?? null, isSuperuser, loading: false });
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isSuperuser: false });
  },
}));
