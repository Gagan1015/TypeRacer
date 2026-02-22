import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { signupSchema } from "@typeracrer/shared";
import { signup } from "@/lib/api/client";
import { useAuthStore } from "@/lib/state/auth-store";

const formSchema = signupSchema.extend({});
type FormValues = z.infer<typeof formSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState<FormValues>({ email: "", username: "", password: "" });
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium text-[#d1d0c5]">create account</h1>
          <p className="mt-2 text-sm text-[#646669]">start your race journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs text-[#646669]">email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-[#2c2e33] px-4 py-2.5 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/40"
            />
          </div>

          {/* Username */}
          <div>
            <label className="mb-1.5 block text-xs text-[#646669]">username</label>
            <input
              type="text"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="speedtyper"
              className="w-full rounded-lg bg-[#2c2e33] px-4 py-2.5 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/40"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-xs text-[#646669]">password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="••••••••"
                className="w-full rounded-lg bg-[#2c2e33] px-4 py-2.5 pr-10 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#646669] transition-colors hover:text-[#d1d0c5]"
                tabIndex={-1}
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
            <p className="rounded-lg bg-[#ca4754]/10 px-3 py-2 text-sm text-[#ca4754]">{error}</p>
          ) : null}

          {/* Submit */}
          <button
            disabled={submitting}
            className="w-full rounded-lg bg-[#e2b714]/15 py-2.5 text-sm font-medium text-[#e2b714] transition-colors hover:bg-[#e2b714]/25 disabled:opacity-40"
          >
            {submitting ? "creating..." : "create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#646669]">
          already have an account?{" "}
          <Link to="/login" className="text-[#e2b714] transition-colors hover:text-[#e2b714]/80">
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
