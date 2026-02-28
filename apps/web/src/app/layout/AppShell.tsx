import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "@/lib/api/client";
import { useAuthStore } from "@/lib/state/auth-store";

const baseLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/multiplayer", label: "Multiplayer" },
  { to: "/profile", label: "Profile" }
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = useMemo(
    () =>
      user?.role === "admin"
        ? [...baseLinks, { to: "/admin", label: "Admin" }]
        : baseLinks,
    [user?.role]
  );

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate("/login");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-8">
      <header className="rounded-2xl border border-[#3b3f47] bg-[#22252b]/95 px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight text-[#f0cd4d] sm:text-3xl"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#f0cd4d]/70 bg-[#f0cd4d]/10 text-sm">
              tr
            </span>
            <span className="hidden sm:inline">typeracrer</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
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

          {/* Desktop user / logout */}
          <div className="hidden items-center gap-3 md:flex">
            <span className="font-mono text-xs text-slate-400">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-[#4d5159] px-3 py-2 text-sm text-slate-200 transition duration-fast hover:border-[#f0cd4d]/70 hover:bg-[#f0cd4d]/10"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200 md:hidden"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile / Tablet Drawer (right side) ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
      />

      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-[#1e2228] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-[#3b3f47] px-5 py-4">
          <span className="font-display text-lg font-semibold tracking-tight text-[#f0cd4d]">
            typeracrer
          </span>
          <button
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Drawer nav links */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2.5 text-sm font-medium transition duration-fast ${
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

        {/* Drawer footer (user + logout) */}
        <div className="border-t border-[#3b3f47] px-5 py-4">
          <p className="mb-3 truncate font-mono text-xs text-slate-400">
            {user?.username}
          </p>
          <button
            onClick={() => { closeDrawer(); void handleLogout(); }}
            className="w-full rounded-xl border border-[#4d5159] px-3 py-2.5 text-sm text-slate-200 transition duration-fast hover:border-[#f0cd4d]/70 hover:bg-[#f0cd4d]/10"
          >
            Logout
          </button>
        </div>
      </div>

      <main className="mt-6 animate-slide-up">
        <Outlet />
      </main>
    </div>
  );
}
