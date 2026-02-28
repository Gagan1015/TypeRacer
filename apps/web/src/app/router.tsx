import { useEffect, type ReactNode } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { OAuthCallbackPage } from "@/features/auth/pages/OAuthCallbackPage";
import { LandingPage } from "@/features/landing/pages/LandingPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { LeaderboardPage } from "@/features/leaderboard/pages/LeaderboardPage";
import { MultiplayerPage } from "@/features/multiplayer/pages/MultiplayerPage";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import { useAuthStore } from "@/lib/state/auth-store";

function RedirectTo({ to }: { to: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);

  return <div className="p-8 text-sm text-muted">Redirecting...</div>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrating = useAuthStore((state) => state.hydrating);

  if (!hydrated || hydrating) {
    return <div className="p-8 text-sm text-muted">Loading session...</div>;
  }

  if (!user) {
    return <RedirectTo to="/login" />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrating = useAuthStore((state) => state.hydrating);

  if (!hydrated || hydrating) {
    return <div className="p-8 text-sm text-muted">Loading session...</div>;
  }

  if (user) {
    return <RedirectTo to="/dashboard" />;
  }

  return <>{children}</>;
}

/** Shows landing page for guests, redirects to dashboard for authenticated users */
function LandingOrDashboard() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrating = useAuthStore((state) => state.hydrating);

  if (!hydrated || hydrating) {
    return <div className="p-8 text-sm text-muted">Loading...</div>;
  }

  if (user) {
    return <RedirectTo to="/dashboard" />;
  }

  return <LandingPage />;
}

export function AppRouter() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Routes>
      {/* Public root — landing page or redirect to dashboard */}
      <Route path="/" element={<LandingOrDashboard />} />

      {/* Guest-only routes */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />

      {/* OAuth callback */}
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />

      {/* Protected app routes (inside AppShell) */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="multiplayer" element={<MultiplayerPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<RedirectTo to="/" />} />
    </Routes>
  );
}
