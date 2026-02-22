import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "@/lib/api/client";
import { useAuthStore } from "@/lib/state/auth-store";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "Profile" }
];

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate("/login");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-8">
      <header className="rounded-2xl border border-[#3b3f47] bg-[#22252b]/95 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-5">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 font-display text-3xl font-semibold tracking-tight text-[#f0cd4d]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#f0cd4d]/70 bg-[#f0cd4d]/10 text-sm">
                tr
              </span>
              typeracrer
            </Link>
            <nav className="flex gap-2">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1 text-sm transition duration-fast ${
                      isActive
                        ? "bg-[#f0cd4d]/15 text-[#f0cd4d]"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-400">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-[#4d5159] px-3 py-2 text-sm text-slate-200 transition duration-fast hover:border-[#f0cd4d]/70 hover:bg-[#f0cd4d]/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mt-6">
        <Outlet />
      </main>
    </div>
  );
}
