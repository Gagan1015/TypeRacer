import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/state/auth-store";

/**
 * This page is the redirect target after a successful OAuth flow.
 * The backend has already set HTTP-only cookies (accessToken / refreshToken).
 * We simply hydrate the auth store (which calls GET /api/auth/me) and redirect.
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const hydrate = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;

    if (user) {
      navigate("/dashboard", { replace: true });
    } else {
      // Tokens were not set properly; send user back to login
      navigate("/login?error=oauth_failed", { replace: true });
    }
  }, [hydrated, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated spinner */}
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2b714] border-t-transparent" />
        <p className="text-sm text-[#646669]">Completing sign-in…</p>
      </div>
    </div>
  );
}
