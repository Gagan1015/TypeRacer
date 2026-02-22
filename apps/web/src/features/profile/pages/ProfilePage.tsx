import { useEffect, useState, type FormEvent } from "react";
import { profileUpdateSchema } from "@typeracrer/shared";
import { Card } from "@/components/ui/card";
import { getMyProfile, updateMyProfile } from "@/lib/api/client";

type ProfileForm = {
  displayName: string;
  bio: string;
  avatarUrl: string;
  keyboardLayout: "qwerty" | "dvorak" | "colemak";
};

export function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>({
    displayName: "",
    bio: "",
    avatarUrl: "",
    keyboardLayout: "qwerty"
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getMyProfile();
        setForm(profile);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load profile");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setError("Please check your profile fields.");
      return;
    }

    try {
      const updated = await updateMyProfile(parsed.data);
      setForm(updated);
      setMessage("Profile updated.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update profile");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading profile...</p>;
  }

  return (
    <Card className="max-w-2xl">
      <h2 className="font-display text-xl font-semibold">Profile settings</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm">Display name</span>
          <input
            type="text"
            value={form.displayName}
            onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition duration-fast focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Bio</span>
          <textarea
            value={form.bio}
            onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition duration-fast focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Avatar URL</span>
          <input
            type="url"
            value={form.avatarUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition duration-fast focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Keyboard layout</span>
          <select
            value={form.keyboardLayout}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                keyboardLayout: event.target.value as ProfileForm["keyboardLayout"]
              }))
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition duration-fast focus:border-accent"
          >
            <option value="qwerty">Qwerty</option>
            <option value="dvorak">Dvorak</option>
            <option value="colemak">Colemak</option>
          </select>
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-white transition duration-fast hover:bg-slate-800">
          Save profile
        </button>
      </form>
    </Card>
  );
}
