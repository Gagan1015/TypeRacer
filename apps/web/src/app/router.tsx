import { useEffect, type ReactNode } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { OAuthCallbackPage } from "@/features/auth/pages/OAuthCallbackPage";
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

export function AppRouter() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Routes>
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
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<RedirectTo to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="multiplayer" element={<MultiplayerPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<RedirectTo to="/login" />} />
    </Routes>
  );
}

