import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileUpdateSchema, type RaceMode } from "@typeracrer/shared";
import { getMyProfile, getMyRaceStats, getMyTypingAttempts, updateMyProfile } from "@/lib/api/client";
import { useAuthStore } from "@/lib/state/auth-store";

type ProfileForm = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  keyboardLayout: "qwerty" | "dvorak" | "colemak";
};

type SettingsTab = "profile" | "typing" | "account";

const keyboardOptions: Array<{ value: ProfileForm["keyboardLayout"]; label: string; description: string }> = [
  { value: "qwerty", label: "QWERTY", description: "standard layout" },
  { value: "dvorak", label: "Dvorak", description: "alternative layout" },
  { value: "colemak", label: "Colemak", description: "optimized layout" }
];

const modeLabels: Record<RaceMode, string> = {
  timed_15: "15s",
  timed_30: "30s",
  timed_60: "60s",
  timed_120: "120s",
  timed_custom: "custom",
  fixed: "fixed"
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function StatBlock({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-xs text-[#646669]">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-light ${accent ? "text-[#e2b714]" : "text-[#d1d0c5]"}`}>
        {value}
      </p>
    </div>
  );
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<SettingsTab>("profile");
  const [form, setForm] = useState<ProfileForm>({
    displayName: "",
    bio: "",
    avatarUrl: "",
    keyboardLayout: "qwerty"
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const statsQuery = useQuery({
    queryKey: ["race", "stats", "me"],
    queryFn: () => getMyRaceStats()
  });

  const attemptsQuery = useQuery({
    queryKey: ["race", "attempts", "me", "profile"],
    queryFn: () => getMyTypingAttempts(10)
  });

  useEffect(() => {
    async function load() {
      try {
        const profile = await getMyProfile();
        setForm(profile);
      } catch (e) {
        setError(e instanceof Error ? e.message : "unable to load profile");
      } finally {
        setProfileLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setError("please check your profile fields");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyProfile(parsed.data);
      setForm(updated);
      setMessage("profile saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  const stats = statsQuery.data;

  const avgAccuracy = useMemo(() => {
    if (!attemptsQuery.data?.length) return 0;
    const sum = attemptsQuery.data.reduce((a, b) => a + b.score.accuracy, 0);
    return Math.round(sum / attemptsQuery.data.length);
  }, [attemptsQuery.data]);

  const initials = (form.displayName || user?.username || "?").slice(0, 2).toUpperCase();

  if (profileLoading) {
    return (
      <section className="mx-auto flex w-full max-w-5xl items-center justify-center py-24">
        <div className="flex items-center gap-3 text-[#646669]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#646669]" />
          <span className="text-sm">loading profile</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center">
      {/* ── Profile header ── */}
      <div className="flex w-full items-center gap-5 rounded-xl bg-[#2c2e33]/70 px-6 py-5">
        {/* Avatar */}
        {form.avatarUrl ? (
          <img
            src={form.avatarUrl}
            alt={form.displayName}
            className="h-16 w-16 shrink-0 rounded-full border-2 border-[#e2b714]/40 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#e2b714]/40 bg-[#e2b714]/10 font-display text-xl font-bold text-[#e2b714]">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-xl font-semibold text-[#d1d0c5]">
            {form.displayName || user?.username}
          </h2>
          <p className="mt-0.5 truncate font-mono text-xs text-[#646669]">@{user?.username}</p>
          {form.bio ? (
            <p className="mt-1 line-clamp-2 text-sm text-[#646669]">{form.bio}</p>
          ) : null}
        </div>

        {/* Quick stats */}
        <div className="hidden gap-8 sm:flex">
          <StatBlock label="best wpm" value={stats?.bestWpm ?? 0} accent />
          <StatBlock label="avg wpm" value={stats?.averageWpm ?? 0} />
          <StatBlock label="races" value={stats?.attemptsCount ?? 0} />
          <StatBlock label="avg acc" value={`${avgAccuracy}%`} />
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="mt-6 flex items-center gap-1 self-start rounded-lg bg-[#2c2e33]/70 px-2 py-1.5">
        {(
          [
            { key: "profile" as const, label: "profile", icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" },
            { key: "typing" as const, label: "stats", icon: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" },
            { key: "account" as const, label: "account", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" }
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "text-[#e2b714]" : "text-[#646669] hover:text-[#d1d0c5]"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d={t.icon} />
              {t.key === "profile" ? <circle cx="12" cy="7" r="4" /> : null}
              {t.key === "typing" ? <line x1="20" y1="21" x2="20" y2="14" /> : null}
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === "profile" ? (
        <div className="mt-6 w-full animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display name */}
            <div>
              <label className="mb-1.5 block text-sm text-[#646669]">display name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                maxLength={32}
                className="w-full rounded-lg bg-[#2c2e33]/70 px-4 py-2.5 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/40"
                placeholder="your display name"
              />
              <p className="mt-1 text-[11px] text-[#4a4d52]">{form.displayName.length}/32 characters</p>
            </div>

            {/* Bio */}
            <div>
              <label className="mb-1.5 block text-sm text-[#646669]">bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                maxLength={280}
                className="w-full resize-none rounded-lg bg-[#2c2e33]/70 px-4 py-2.5 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/40"
                placeholder="tell us about yourself"
              />
              <p className="mt-1 text-[11px] text-[#4a4d52]">{form.bio.length}/280 characters</p>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="mb-1.5 block text-sm text-[#646669]">avatar url</label>
              <input
                type="url"
                value={form.avatarUrl}
                onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                className="w-full rounded-lg bg-[#2c2e33]/70 px-4 py-2.5 font-mono text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/40"
                placeholder="https://example.com/avatar.png"
              />
            </div>

            {/* Keyboard layout */}
            <div>
              <label className="mb-2 block text-sm text-[#646669]">keyboard layout</label>
              <div className="flex gap-2">
                {keyboardOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, keyboardLayout: opt.value }))}
                    className={`flex-1 rounded-lg px-3 py-3 text-center transition-colors ${
                      form.keyboardLayout === opt.value
                        ? "bg-[#e2b714]/15 text-[#e2b714] ring-1 ring-[#e2b714]/40"
                        : "bg-[#2c2e33]/70 text-[#646669] hover:text-[#d1d0c5]"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] opacity-60">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            {error ? (
              <p className="rounded-lg bg-[#ca4754]/10 px-4 py-2 text-sm text-[#ca4754]">{error}</p>
            ) : null}
            {message ? (
              <p className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{message}</p>
            ) : null}

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#e2b714]/15 px-6 py-2.5 text-sm font-medium text-[#e2b714] transition-colors hover:bg-[#e2b714]/25 disabled:opacity-40"
            >
              {saving ? "saving..." : "save profile"}
            </button>
          </form>
        </div>
      ) : null}

      {/* ── Typing stats tab ── */}
      {tab === "typing" ? (
        <div className="mt-6 w-full animate-fade-in">
          {/* Big overview stats */}
          <div className="flex flex-wrap items-end justify-center gap-10 rounded-xl bg-[#2c2e33]/50 py-8">
            <div className="text-center">
              <p className="text-sm text-[#646669]">best wpm</p>
              <p className="font-mono text-5xl font-light text-[#e2b714]">{stats?.bestWpm ?? 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#646669]">avg wpm</p>
              <p className="font-mono text-5xl font-light text-[#e2b714]">{stats?.averageWpm ?? 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#646669]">best acc</p>
              <p className="font-mono text-3xl text-[#d1d0c5]">{stats?.bestAccuracy ?? 0}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#646669]">avg acc</p>
              <p className="font-mono text-3xl text-[#d1d0c5]">{avgAccuracy}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#646669]">races</p>
              <p className="font-mono text-3xl text-[#646669]">{stats?.attemptsCount ?? 0}</p>
            </div>
          </div>

          {/* Mode personal bests */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {(["timed_15", "timed_30", "timed_60", "timed_120", "timed_custom"] as RaceMode[]).map((mode) => (
              <div key={mode} className="rounded-xl bg-[#2c2e33]/50 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-[#4a4d52]">pb — {modeLabels[mode]}</p>
                <p className="mt-2 font-mono text-3xl font-light text-[#e2b714]">
                  {stats?.personalBestByMode[mode] ?? 0}
                </p>
                <p className="mt-1 text-xs text-[#646669]">wpm</p>
              </div>
            ))}
          </div>

          {/* Recent attempts */}
          <div className="mt-6 rounded-xl bg-[#2c2e33]/50 p-5">
            <h3 className="mb-4 text-sm font-medium text-[#646669]">recent attempts</h3>
            {attemptsQuery.isLoading ? (
              <p className="text-sm text-[#646669]">loading...</p>
            ) : !attemptsQuery.data?.length ? (
              <p className="text-sm text-[#646669]">no attempts yet — start typing to begin</p>
            ) : (
              <div className="space-y-0 text-sm">
                {attemptsQuery.data.map((attempt, i) => (
                  <div
                    key={attempt.id}
                    className={`flex items-center justify-between py-3 ${
                      i < (attemptsQuery.data?.length ?? 0) - 1 ? "border-b border-[#3a3d42]/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-10 font-mono text-xs text-[#e2b714]">{modeLabels[attempt.mode]}</span>
                      <span className="font-mono text-[#d1d0c5]">{attempt.score.wpm} wpm</span>
                      <span className="font-mono text-[#646669]">{attempt.score.accuracy}%</span>
                      <span className="hidden font-mono text-[#4a4d52] sm:inline">{attempt.score.progress}%</span>
                    </div>
                    <span className="text-xs text-[#646669]">{formatDate(attempt.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Typing insights */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#2c2e33]/50 p-5">
              <h3 className="mb-3 text-sm font-medium text-[#646669]">consistency</h3>
              {attemptsQuery.data && attemptsQuery.data.length > 1 ? (
                <>
                  {(() => {
                    const wpms = attemptsQuery.data.map((a) => a.score.wpm);
                    const min = Math.min(...wpms);
                    const max = Math.max(...wpms);
                    const range = max - min;
                    const avg = Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length);
                    const consistency = avg > 0 ? Math.max(0, Math.round(100 - (range / avg) * 100)) : 0;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-end justify-between">
                          <span className="font-mono text-3xl font-light text-[#d1d0c5]">{consistency}%</span>
                          <span className="text-xs text-[#4a4d52]">wpm range: {min}–{max}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e2228]">
                          <div
                            className="h-full rounded-full bg-[#e2b714]/60 transition-all duration-500"
                            style={{ width: `${consistency}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <p className="text-sm text-[#4a4d52]">need more attempts for data</p>
              )}
            </div>

            <div className="rounded-xl bg-[#2c2e33]/50 p-5">
              <h3 className="mb-3 text-sm font-medium text-[#646669]">accuracy trend</h3>
              {attemptsQuery.data && attemptsQuery.data.length > 1 ? (
                <div className="flex items-end gap-1">
                  {attemptsQuery.data
                    .slice()
                    .reverse()
                    .map((attempt, i) => (
                      <div
                        key={attempt.id}
                        className="flex-1 rounded-sm bg-[#e2b714]/40 transition-all hover:bg-[#e2b714]/70"
                        style={{ height: `${Math.max(attempt.score.accuracy * 0.6, 8)}px` }}
                        title={`${attempt.score.accuracy}% — ${formatDate(attempt.createdAt)}`}
                      />
                    ))}
                </div>
              ) : (
                <p className="text-sm text-[#4a4d52]">need more attempts for data</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Account tab ── */}
      {tab === "account" ? (
        <div className="mt-6 w-full animate-fade-in">
          <div className="rounded-xl bg-[#2c2e33]/50 p-5">
            <h3 className="mb-4 text-sm font-medium text-[#646669]">account details</h3>
            <div className="space-y-0 text-sm">
              <div className="flex items-center justify-between border-b border-[#3a3d42]/50 py-3">
                <span className="text-[#646669]">username</span>
                <span className="font-mono text-[#d1d0c5]">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#3a3d42]/50 py-3">
                <span className="text-[#646669]">email</span>
                <span className="font-mono text-[#d1d0c5]">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#3a3d42]/50 py-3">
                <span className="text-[#646669]">role</span>
                <span className={`font-mono ${user?.role === "admin" ? "text-[#e2b714]" : "text-[#d1d0c5]"}`}>{user?.role}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#3a3d42]/50 py-3">
                <span className="text-[#646669]">keyboard</span>
                <span className="font-mono text-[#d1d0c5]">{form.keyboardLayout}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[#646669]">total races</span>
                <span className="font-mono text-[#d1d0c5]">{stats?.attemptsCount ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="mt-6 rounded-xl border border-[#ca4754]/20 bg-[#ca4754]/5 p-5">
            <h3 className="mb-2 text-sm font-medium text-[#ca4754]">danger zone</h3>
            <p className="mb-4 text-xs text-[#646669]">
              these actions are irreversible. proceed with caution.
            </p>
            <button
              type="button"
              className="rounded-lg border border-[#ca4754]/30 px-4 py-2 text-sm text-[#ca4754] transition-colors hover:bg-[#ca4754]/10"
              onClick={() => {
                /* placeholder — would need a delete account API */
                setError("account deletion is not yet available");
                setTab("profile");
              }}
            >
              delete account
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
