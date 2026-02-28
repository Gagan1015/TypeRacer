import { useState, type FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { signupSchema } from "@typeracrer/shared";
import { signup } from "@/lib/api/client";
import { useAuthStore } from "@/lib/state/auth-store";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const formSchema = signupSchema.extend({});
type FormValues = z.infer<typeof formSchema>;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function TypingAnimation() {
  const text = "Practice makes perfect — race to the top!";
  const [displayedIndex, setDisplayedIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedIndex((prev) => {
        if (prev >= text.length) return 0;
        return prev + 1;
      });
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
      <p className="whitespace-nowrap font-mono text-6xl font-bold text-[#e2b714] sm:text-8xl">
        {text.slice(0, displayedIndex)}
        <span className="animate-pulse">|</span>
      </p>
    </div>
  );
}

export function SignupPage() {
  useDocumentTitle("Sign Up");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState<FormValues>({ email: "", username: "", password: "" });
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Show OAuth error from redirect
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError).replace(/_/g, " "));
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      setError("Use a valid email, username, and password (8+ chars).");
      return;
    }

    setSubmitting(true);
    try {
      const user = await signup(parsed.data);
      setUser(user);
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* Background typing animation */}
      <TypingAnimation />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-[#e2b714]/50 bg-[#e2b714]/10 text-lg font-bold text-[#e2b714]">
            tr
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#d1d0c5]">create account</h1>
          <p className="mt-2 text-sm text-[#646669]">start your typing race journey</p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-[#3b3f47]/60 bg-[#2c2e33]/50 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          {/* OAuth Buttons */}
          <div className="space-y-3">
            <a
              href={`${API_URL}/api/auth/google`}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-[#3b3f47] bg-white px-4 py-3 text-sm font-medium text-[#1f2937] transition-all duration-200 hover:border-[#4285F4]/50 hover:shadow-[0_0_20px_rgba(66,133,244,0.15)]"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </a>

            <a
              href={`${API_URL}/api/auth/github`}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-[#3b3f47] bg-[#24292e] px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-[#8b949e]/50 hover:bg-[#2d3339] hover:shadow-[0_0_20px_rgba(139,148,158,0.1)]"
            >
              <GithubIcon />
              <span>Continue with GitHub</span>
            </a>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3b3f47] to-transparent" />
            <span className="text-xs text-[#646669]">or create an account</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3b3f47] to-transparent" />
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#646669]">email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-[#3b3f47]/50 bg-[#1e2228] px-4 py-3 text-sm text-[#d1d0c5] outline-none transition-all duration-200 placeholder:text-[#4a4d52] focus:border-[#e2b714]/40 focus:ring-1 focus:ring-[#e2b714]/20"
              />
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#646669]">username</label>
              <input
                type="text"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="speedtyper"
                autoComplete="username"
                className="w-full rounded-xl border border-[#3b3f47]/50 bg-[#1e2228] px-4 py-3 text-sm text-[#d1d0c5] outline-none transition-all duration-200 placeholder:text-[#4a4d52] focus:border-[#e2b714]/40 focus:ring-1 focus:ring-[#e2b714]/20"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#646669]">password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-[#3b3f47]/50 bg-[#1e2228] px-4 py-3 pr-10 text-sm text-[#d1d0c5] outline-none transition-all duration-200 placeholder:text-[#4a4d52] focus:border-[#e2b714]/40 focus:ring-1 focus:ring-[#e2b714]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#646669] transition-colors hover:text-[#d1d0c5]"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-[#4a4d52]">minimum 8 characters</p>
            </div>

            {/* Error */}
            {error ? (
              <div className="flex items-center gap-2 rounded-xl bg-[#ca4754]/10 px-4 py-3 text-sm text-[#ca4754]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span>{error}</span>
              </div>
            ) : null}

            {/* Submit */}
            <button
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-[#e2b714] to-[#d4a50f] py-3 text-sm font-semibold text-[#1e2228] shadow-[0_4px_20px_rgba(226,183,20,0.25)] transition-all duration-200 hover:shadow-[0_4px_30px_rgba(226,183,20,0.35)] disabled:opacity-40"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1e2228]/30 border-t-[#1e2228]" />
                  creating...
                </span>
              ) : (
                "create account"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-[#646669]">
          already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-[#e2b714] transition-colors hover:text-[#f0cd4d]"
          >
            sign in
          </Link>
        </p>

        {/* Stats bar */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[10px] text-[#4a4d52]">
          <span>⚡ real-time races</span>
          <span className="h-3 w-px bg-[#3b3f47]" />
          <span>🏆 global leaderboards</span>
          <span className="h-3 w-px bg-[#3b3f47]" />
          <span>👥 multiplayer</span>
        </div>
      </div>
    </div>
  );
}
