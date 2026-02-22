import {
  type CreateTypingAttemptInput,
  type LoginInput,
  type ProfileUpdateInput,
  type RaceMode,
  type RaceStats,
  type RaceText,
  type SignupInput,
  type TypingAttempt
} from "@typeracrer/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type ApiFailure = {
  success: false;
  error: { code: string; message: string };
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    const message = payload.success ? "Request failed" : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
}

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
};

export type ProfilePayload = {
  profile: {
    userId: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    keyboardLayout: "qwerty" | "dvorak" | "colemak";
  };
};

export async function signup(input: SignupInput): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return data.user;
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return data.user;
}

export async function me(): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>("/api/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  await request<{ loggedOut: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function getMyProfile(): Promise<ProfilePayload["profile"]> {
  const data = await request<ProfilePayload>("/api/profile/me");
  return data.profile;
}

export async function updateMyProfile(input: ProfileUpdateInput): Promise<ProfilePayload["profile"]> {
  const data = await request<ProfilePayload>("/api/profile/me", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return data.profile;
}

export async function getRaceText(mode: RaceMode, durationMs?: number): Promise<RaceText> {
  const params = new URLSearchParams({ mode });
  if (durationMs && Number.isFinite(durationMs)) {
    params.set("durationMs", String(Math.round(durationMs)));
  }
  const data = await request<{ text: RaceText }>(`/api/race/text?${params.toString()}`);
  return data.text;
}

export async function createTypingAttempt(input: CreateTypingAttemptInput): Promise<TypingAttempt> {
  const data = await request<{ attempt: TypingAttempt }>("/api/race/attempts", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return data.attempt;
}

export async function getMyTypingAttempts(limit = 10): Promise<TypingAttempt[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const data = await request<{ attempts: TypingAttempt[] }>(`/api/race/attempts/me?${params.toString()}`);
  return data.attempts;
}

export async function getMyRaceStats(): Promise<RaceStats> {
  const data = await request<{ stats: RaceStats }>("/api/race/stats/me");
  return data.stats;
}
