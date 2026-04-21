import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  Clock,
  Mail,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { formatDate } from "../lib/utils";

interface AppUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_superuser: boolean;
}

async function callManageUsers(body: object) {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser, isSuperuser } = useAuthStore();

  // Redirect non-superusers immediately
  useEffect(() => {
    if (!isSuperuser) navigate("/", { replace: true });
  }, [isSuperuser, navigate]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callManageUsers({ action: "list" });
      setUsers(
        [...data.users].sort(
          (a: AppUser, b: AppUser) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperuser) fetchUsers();
  }, [isSuperuser, fetchUsers]);

  // ── Invite ─────────────────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await callManageUsers({ action: "invite", email: inviteEmail });
      setInviteSuccess(true);
      setInviteEmail("");
      fetchUsers();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : String(e));
    } finally {
      setInviting(false);
    }
  };

  // ── Toggle superuser ───────────────────────────────────────────────────────
  const handleToggleSuperuser = async (u: AppUser) => {
    setTogglingId(u.id);
    try {
      await callManageUsers({
        action: "set_superuser",
        userId: u.id,
        isSuperuser: !u.is_superuser,
      });
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, is_superuser: !u.is_superuser } : x
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTogglingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!isSuperuser) return null;

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ניהול משתמשים</h1>
            <p className="text-sm text-gray-400">{users.length} משתמשים רשומים</p>
          </div>
        </div>
        <button
          onClick={() => { setInviteOpen(true); setInviteSuccess(false); setInviteError(null); }}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          הזמן משתמש
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 mb-4 border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
          <br />
          <span className="text-xs text-red-500">
            וודא שה-Edge Function <code className="font-mono">manage-users</code> פרוסה ב-Supabase.
          </span>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className={`card p-4 flex items-center gap-4 ${
                u.id === currentUser?.id ? "ring-2 ring-indigo-200" : ""
              }`}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-sm">
                {u.email[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {u.email}
                  </span>
                  {u.id === currentUser?.id && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5">
                      אתה
                    </span>
                  )}
                  {u.is_superuser && (
                    <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      מנהל
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    נרשם {formatDate(u.created_at)}
                  </span>
                  {u.last_sign_in_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      כניסה אחרונה {formatDate(u.last_sign_in_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle superuser */}
              <button
                onClick={() => handleToggleSuperuser(u)}
                disabled={togglingId === u.id}
                title={u.is_superuser ? "הסר הרשאת מנהל" : "הענק הרשאת מנהל"}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                  u.is_superuser
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {togglingId === u.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : u.is_superuser ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <Shield className="w-3.5 h-3.5" />
                )}
                {u.is_superuser ? "מנהל" : "משתמש רגיל"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">הזמנת משתמש חדש</h2>
              <button
                onClick={() => setInviteOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">ההזמנה נשלחה!</p>
                <p className="text-sm text-gray-500">
                  המשתמש יקבל מייל עם קישור להתחברות.
                </p>
                <button
                  onClick={() => { setInviteSuccess(false); setInviteOpen(false); }}
                  className="btn-secondary mt-4"
                >
                  סגור
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="label-base">כתובת מייל</label>
                  <input
                    type="email"
                    autoFocus
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-base"
                    placeholder="therapist@example.com"
                    required
                    disabled={inviting}
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    המשתמש יקבל מייל עם קישור הזמנה להגדרת סיסמה.
                  </p>
                </div>

                {inviteError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {inviteError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {inviting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> שלח הזמנה</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteOpen(false)}
                    className="btn-secondary flex-1"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
