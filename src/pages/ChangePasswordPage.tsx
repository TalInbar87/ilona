import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

async function clearForceChange() {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body: { action: "clear_force_change" },
  });
  if (error) throw new Error(data?.error ?? error.message);
  if (data?.error) throw new Error(data.error);
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = password.length >= 6 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Change the password
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // 2. Clear the force-change flag (updates app_metadata via service role)
      await clearForceChange();

      // 3. Refresh the session so the new JWT (without the flag) is active
      await supabase.auth.refreshSession();

      setDone(true);
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">הגדרת סיסמה</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            ברוך הבא! אנא הגדר סיסמה אישית לפני הכניסה למערכת.
          </p>
          {user?.email && (
            <p className="text-xs text-gray-400 mt-1 font-mono">{user.email}</p>
          )}
        </div>

        {done ? (
          <div className="card p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-semibold text-gray-900">הסיסמה הוגדרה בהצלחה!</p>
            <p className="text-sm text-gray-500 mt-1">מועבר/ת למערכת...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            {/* New password */}
            <div>
              <label className="label-base">סיסמה חדשה</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pl-10"
                  placeholder="לפחות 6 תווים"
                  required
                  minLength={6}
                  disabled={loading}
                  dir="ltr"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[6, 8, 12].map((len, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= len
                          ? ["bg-red-400", "bg-amber-400", "bg-emerald-400"][i]
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="label-base">אימות סיסמה</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`input-base pl-10 ${mismatch ? "border-red-300 focus:ring-red-300" : ""}`}
                  placeholder="הזן שוב את הסיסמה"
                  required
                  disabled={loading}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="text-xs text-red-500 mt-1">הסיסמאות אינן תואמות</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={!valid || loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> מגדיר סיסמה...</>
              ) : (
                <><KeyRound className="w-4 h-4" /> הגדר סיסמה וכנס למערכת</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
