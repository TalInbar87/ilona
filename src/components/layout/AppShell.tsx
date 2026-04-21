import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  LayoutDashboard,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "ראשי" },
  { to: "/patients", icon: Users, label: "מטופלים" },
  { to: "/calendar", icon: Calendar, label: "לוח שנה" },
];

export function AppShell() {
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-l border-gray-100 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">מרפאת איילונה</p>
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
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            התנתקות
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
