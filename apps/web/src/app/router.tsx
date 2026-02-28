import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoader } from "./components/PageLoader";
import { useAuthStore } from "@/lib/state/auth-store";

/* ── Lazy-loaded pages (code-split per route) ── */
const LandingPage = lazy(() =>
  import("@/features/landing/pages/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() =>
  import("@/features/auth/pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const SignupPage = lazy(() =>
  import("@/features/auth/pages/SignupPage").then((m) => ({ default: m.SignupPage }))
);
const OAuthCallbackPage = lazy(() =>
  import("@/features/auth/pages/OAuthCallbackPage").then((m) => ({ default: m.OAuthCallbackPage }))
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const LeaderboardPage = lazy(() =>
  import("@/features/leaderboard/pages/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage }))
);
const MultiplayerPage = lazy(() =>
  import("@/features/multiplayer/pages/MultiplayerPage").then((m) => ({ default: m.MultiplayerPage }))
);
const ProfilePage = lazy(() =>
  import("@/features/profile/pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const AdminPage = lazy(() =>
  import("@/features/admin/pages/AdminPage").then((m) => ({ default: m.AdminPage }))
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

/* ── Route guards ── */

function RedirectTo({ to }: { to: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);

  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrating = useAuthStore((state) => state.hydrating);

  if (!hydrated || hydrating) {
    return <PageLoader />;
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
    return <PageLoader />;
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
    return <PageLoader />;
  }

  if (user) {
    return <RedirectTo to="/dashboard" />;
  }

  return <LandingPage />;
}

/* ── Router ── */

export function AppRouter() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
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

          {/* 404 — styled not found page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
