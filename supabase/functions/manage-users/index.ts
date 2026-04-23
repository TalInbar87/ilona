// Supabase Edge Function — manage-users
// Deploy: supabase functions deploy manage-users
//
// Handles 3 actions (all require the caller to be a superuser):
//   { action: "list" }
//   { action: "invite",       email: string }
//   { action: "set_superuser", userId: string, isSuperuser: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Admin client — full access (service role key is auto-injected by Supabase)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ── Verify caller is authenticated ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user: caller }, error: authErr } =
      await admin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authErr || !caller) return json({ error: "Unauthorized" }, 401);

    // ── Route action ────────────────────────────────────────────────────────
    const body = await req.json();
    const { action } = body;

    // CLEAR FORCE PASSWORD CHANGE — any authenticated user can call this for themselves
    if (action === "clear_force_change") {
      const { error: updateErr } = await admin.auth.admin.updateUserById(caller.id, {
        app_metadata: { force_password_change: false },
      });
      if (updateErr) throw updateErr;
      return json({ ok: true });
    }

    // ── Verify caller is a superuser (required for all remaining actions) ───
    const { data: callerProfile, error: profileErr } = await admin
      .from("profiles")
      .select("is_superuser")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.is_superuser) return json({
      error: "Forbidden",
      _debug: {
        caller_id: caller.id,
        caller_email: caller.email,
        profile: callerProfile,
        profile_error: profileErr?.message ?? null,
      }
    }, 403);

    // LIST ALL USERS
    if (action === "list") {
      const { data: authData, error: listErr } =
        await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;

      const { data: profiles } = await admin
        .from("profiles")
        .select("id, is_superuser, first_name, last_name");

      const profileMap: Record<string, { is_superuser: boolean; first_name: string | null; last_name: string | null }> = {};
      for (const p of profiles ?? []) {
        profileMap[p.id] = {
          is_superuser: p.is_superuser,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
        };
      }

      const now = new Date();
      const users = authData.users.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        is_superuser: profileMap[u.id]?.is_superuser ?? false,
        first_name: profileMap[u.id]?.first_name ?? null,
        last_name: profileMap[u.id]?.last_name ?? null,
        is_banned: !!(u.banned_until && new Date(u.banned_until) > now),
      }));

      return json({ users });
    }

    // CREATE NEW USER WITH EMAIL + PASSWORD (no invite email)
    if (action === "create") {
      const { email, password, first_name, last_name } = body as {
        email?: string; password?: string;
        first_name?: string; last_name?: string;
      };
      if (!email?.trim()) return json({ error: "נדרש מייל" }, 400);
      if (!password || password.length < 6)
        return json({ error: "סיסמה חייבת להכיל לפחות 6 תווים" }, 400);

      const { data, error: createErr } = await admin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        app_metadata: { force_password_change: true },
      });
      if (createErr) throw createErr;

      // Save name to profile (profile row created by DB trigger on auth.users insert)
      if (first_name?.trim() || last_name?.trim()) {
        await admin.from("profiles").update({
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
        }).eq("id", data.user.id);
      }

      return json({ user: { id: data.user.id, email: data.user.email } });
    }

    // SET / UNSET SUPERUSER STATUS
    if (action === "set_superuser") {
      const { userId, isSuperuser } = body as {
        userId?: string;
        isSuperuser?: boolean;
      };
      if (!userId) return json({ error: "userId required" }, 400);

      // Prevent superuser from removing their own admin status
      if (userId === caller.id && !isSuperuser) {
        return json(
          { error: "אין אפשרות להסיר הרשאת מנהל מהמשתמש הנוכחי" },
          400
        );
      }

      const { error: updateErr } = await admin
        .from("profiles")
        .update({ is_superuser: isSuperuser })
        .eq("id", userId);
      if (updateErr) throw updateErr;

      return json({ ok: true });
    }

    // BAN USER (soft delete — data preserved, login blocked)
    if (action === "ban") {
      const { userId } = body as { userId?: string };
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === caller.id) return json({ error: "אין אפשרות לחסום את המשתמש הנוכחי" }, 400);

      const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // ~100 years
      });
      if (banErr) throw banErr;

      return json({ ok: true });
    }

    // UNBAN USER
    if (action === "unban") {
      const { userId } = body as { userId?: string };
      if (!userId) return json({ error: "userId required" }, 400);

      const { error: unbanErr } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
      if (unbanErr) throw unbanErr;

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
