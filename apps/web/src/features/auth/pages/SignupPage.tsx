import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { signupSchema } from "@typeracrer/shared";
import { signup } from "@/lib/api/client";
import { useAuthStore } from "@/lib/state/auth-store";
import { Card } from "@/components/ui/card";

const formSchema = signupSchema.extend({});
type FormValues = z.infer<typeof formSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState<FormValues>({ email: "", username: "", password: "" });
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="mx-auto flex min-h-screen max-w-xl items-center px-4">
      <Card className="w-full">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-muted">Start your race journey.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition duration-fast focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Username</span>
            <input
              type="text"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition duration-fast focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition duration-fast focus:border-accent"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 font-medium text-white transition duration-fast hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
