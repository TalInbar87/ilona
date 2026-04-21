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

    // ── Verify caller is a superuser ────────────────────────────────────────
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("is_superuser")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.is_superuser) return json({ error: "Forbidden" }, 403);

    // ── Route action ────────────────────────────────────────────────────────
    const body = await req.json();
    const { action } = body;

    // LIST ALL USERS
    if (action === "list") {
      const { data: authData, error: listErr } =
        await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;

      const { data: profiles } = await admin
        .from("profiles")
        .select("id, is_superuser");

      const profileMap: Record<string, boolean> = {};
      for (const p of profiles ?? []) {
        profileMap[p.id] = p.is_superuser;
      }

      const users = authData.users.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        is_superuser: profileMap[u.id] ?? false,
      }));

      return json({ users });
    }

    // INVITE NEW USER BY EMAIL
    if (action === "invite") {
      const { email } = body as { email?: string };
      if (!email?.trim()) return json({ error: "Email required" }, 400);

      const origin = req.headers.get("origin") ?? "http://localhost:5173";
      const { data, error: inviteErr } =
        await admin.auth.admin.inviteUserByEmail(email.trim(), {
          redirectTo: origin,
        });
      if (inviteErr) throw inviteErr;

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

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
