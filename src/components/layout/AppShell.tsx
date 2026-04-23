import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Users, Calendar, LayoutDashboard, LogOut, Stethoscope, GraduationCap, Menu, X, BookOpen, ShieldCheck, Pencil, Check } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "ראשי" },
  { to: "/patients", icon: Users, label: "מטופלים" },
  { to: "/supervisees", icon: GraduationCap, label: "מודרכות" },
  { to: "/calendar", icon: Calendar, label: "לוח שנה" },
  { to: "/goals-bank", icon: BookOpen, label: "בנק מטרות" },
];

export function AppShell() {
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);
  const isSuperuser = useAuthStore((s) => s.isSuperuser);
  const superuserLoading = useAuthStore((s) => s.superuserLoading);
  const firstName = useAuthStore((s) => s.firstName);
  const lastName = useAuthStore((s) => s.lastName);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const startEditProfile = () => {
    setProfileForm({ first_name: firstName ?? "", last_name: lastName ?? "" });
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await supabase.from("profiles").update({
      first_name: profileForm.first_name.trim() || null,
      last_name: profileForm.last_name.trim() || null,
    }).eq("id", user.id);
    await refreshProfile();
    setSavingProfile(false);
    setEditingProfile(false);
  };

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">מערכת ניהול</p>
          <p className="text-xs text-gray-400">קלינאות תקשורת</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sky-50 text-sky-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* Superuser only */}
        {!superuserLoading && isSuperuser && (
          <>
            <div className="border-t border-gray-100 my-1" />
            <NavLink
              to="/users"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
                )
              }
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              ניהול משתמשים
            </NavLink>
          </>
        )}
      </nav>

      {/* User + Sign out */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        {/* Profile edit inline */}
        {editingProfile ? (
          <div className="px-3 py-2 space-y-2">
            <input
              autoFocus
              type="text"
              value={profileForm.first_name}
              onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
              placeholder="שם פרטי"
              className="input-base text-xs py-1.5"
            />
            <input
              type="text"
              value={profileForm.last_name}
              onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
              placeholder="שם משפחה"
              className="input-base text-xs py-1.5"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1 disabled:opacity-60"
              >
                <Check className="w-3 h-3" />
                {savingProfile ? "..." : "שמירה"}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="btn-secondary text-xs py-1 px-2.5"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-3 mb-1">
            <div className="flex-1 min-w-0">
              {displayName && (
                <p className="text-xs font-medium text-gray-700 truncate">{displayName}</p>
              )}
              {user?.email && (
                <p className="text-xs text-gray-400 truncate" title={user.email}>{user.email}</p>
              )}
            </div>
            <button
              onClick={startEditProfile}
              className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500 transition-colors shrink-0"
              title="עריכת פרופיל"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          התנתקות
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-l border-gray-100 flex-col shadow-sm shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 right-0 left-0 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sky-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-bold text-gray-900">מערכת ניהול</p>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white h-full flex flex-col shadow-xl mr-auto">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 left-4 p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        <Outlet />
      </main>
    </div>
  );
}
