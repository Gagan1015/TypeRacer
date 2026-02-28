import {
  type CreateTypingAttemptInput,
  type RaceTextOptions,
  type LeaderboardSeason,
  type LoginInput,
  type ProfileUpdateInput,
  type RaceMode,
  type RaceStats,
  type RaceText,
  type RankedLeaderboard,
  type RankedMatchRecord,
  type RankedProfile,
  type SignupInput,
  type TypingAttempt,
  type TypingLeaderboard
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
  avatarUrl: string | null;
  provider: "local" | "google" | "github";
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

export async function getRaceText(mode: RaceMode, durationMs?: number, options?: RaceTextOptions): Promise<RaceText> {
  const params = new URLSearchParams({ mode });
  if (durationMs && Number.isFinite(durationMs)) {
    params.set("durationMs", String(Math.round(durationMs)));
  }
  if (options?.themes?.length) {
    for (const theme of options.themes) {
      params.append("themes", theme);
    }
  }
  if (options?.characterProfile) {
    params.set("characterProfile", options.characterProfile);
  }
  if (options?.difficulty) {
    params.set("difficulty", options.difficulty);
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

// ── Leaderboard ──

export async function getGlobalTypingLeaderboard(
  mode: RaceMode = "timed_30",
  limit = 50
): Promise<TypingLeaderboard> {
  const params = new URLSearchParams({ mode, limit: String(limit) });
  const data = await request<{ leaderboard: TypingLeaderboard }>(
    `/api/leaderboard/typing/global?${params.toString()}`
  );
  return data.leaderboard;
}

export async function getSeasonalTypingLeaderboard(
  mode: RaceMode = "timed_30",
  limit = 50,
  seasonId?: string
): Promise<TypingLeaderboard> {
  const params = new URLSearchParams({ mode, limit: String(limit) });
  if (seasonId) params.set("seasonId", seasonId);
  const data = await request<{ leaderboard: TypingLeaderboard }>(
    `/api/leaderboard/typing/seasonal?${params.toString()}`
  );
  return data.leaderboard;
}

export async function getCurrentSeason(): Promise<LeaderboardSeason> {
  const data = await request<{ season: LeaderboardSeason }>("/api/leaderboard/seasons/current");
  return data.season;
}

// ── Ranked ──

export async function getRankedLeaderboard(
  scope: "global" | "seasonal" = "global",
  limit = 50,
  seasonId?: string
): Promise<RankedLeaderboard> {
  const params = new URLSearchParams({ scope, limit: String(limit) });
  if (seasonId) params.set("seasonId", seasonId);
  const data = await request<{ leaderboard: RankedLeaderboard }>(
    `/api/ranked/leaderboard?${params.toString()}`
  );
  return data.leaderboard;
}

export async function getMyRankedProfile(seasonId?: string): Promise<RankedProfile> {
  const params = new URLSearchParams();
  if (seasonId) params.set("seasonId", seasonId);
  const qs = params.toString();
  const data = await request<{ profile: RankedProfile }>(
    `/api/ranked/me${qs ? `?${qs}` : ""}`
  );
  return data.profile;
}

export async function getMyRankedHistory(limit = 20): Promise<RankedMatchRecord[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const data = await request<{ matches: RankedMatchRecord[] }>(
    `/api/ranked/history/me?${params.toString()}`
  );
  return data.matches;
}

// ── Admin ──

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  sessionsCount: number;
};

export type AdminUserDetail = {
  user: {
    id: string;
    email: string;
    username: string;
    role: "user" | "admin";
    isBanned: boolean;
    banReason: string | null;
    bannedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  profile: {
    displayName: string;
    bio: string;
    avatarUrl: string;
    keyboardLayout: "qwerty" | "dvorak" | "colemak";
  } | null;
  moderation: {
    attemptsCount: number;
    suspiciousAttemptsCount: number;
    openReportsCount: number;
  };
};

export type AdminText = {
  id: string;
  key: string;
  content: string;
  language: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportStatus = "open" | "in_review" | "resolved_cheat" | "resolved_clean" | "dismissed";

export type AdminReport = {
  id: string;
  source: "system" | "user" | "admin";
  status: ReportStatus;
  targetType: "typing_attempt" | "user" | "text";
  targetId: string;
  suspectUserId: string;
  summary: string;
  reasons: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    confidence: number;
    message: string;
  }>;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type AdminReportDetail = AdminReport & {
  detail: string;
  reviewNote: string;
  updatedAt: string;
};

export type AdminAuditLog = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: "report" | "user" | "text";
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function listAdminUsers(query?: string, limit = 50): Promise<AdminUser[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set("query", query);
  const data = await request<{ users: AdminUser[] }>(`/api/admin/users?${params.toString()}`);
  return data.users;
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  return request<AdminUserDetail>(`/api/admin/users/${userId}`);
}

export async function updateUserModeration(
  userId: string,
  payload: { isBanned: boolean; reason?: string }
): Promise<{ user: { id: string; isBanned: boolean; banReason: string | null; bannedAt: string | null } }> {
  return request<{ user: { id: string; isBanned: boolean; banReason: string | null; bannedAt: string | null } }>(
    `/api/admin/users/${userId}/moderation`,
    { method: "PATCH", body: JSON.stringify(payload) }
  );
}

export async function listAdminTexts(
  status: "active" | "inactive" | "all" = "all",
  limit = 100
): Promise<AdminText[]> {
  const params = new URLSearchParams({ status, limit: String(limit) });
  const data = await request<{ texts: AdminText[] }>(`/api/admin/texts?${params.toString()}`);
  return data.texts;
}

export async function createAdminText(payload: {
  content: string;
  language: string;
  key?: string;
}): Promise<{ text: AdminText }> {
  return request<{ text: AdminText }>("/api/admin/texts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminText(
  textId: string,
  payload: { content?: string; language?: string; isActive?: boolean }
): Promise<{ text: AdminText }> {
  return request<{ text: AdminText }>(`/api/admin/texts/${textId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function listAdminReports(
  status: "open" | "in_review" | "resolved_cheat" | "resolved_clean" | "dismissed" | "all" = "all",
  limit = 100
): Promise<AdminReport[]> {
  const params = new URLSearchParams({ status, limit: String(limit) });
  const data = await request<{ reports: AdminReport[] }>(`/api/admin/reports?${params.toString()}`);
  return data.reports;
}

export async function getAdminReportDetail(reportId: string): Promise<AdminReportDetail> {
  const data = await request<{ report: AdminReportDetail }>(`/api/admin/reports/${reportId}`);
  return data.report;
}

export async function reviewAdminReport(
  reportId: string,
  payload: { status: ReportStatus; note: string }
): Promise<{ report: { id: string; status: ReportStatus; reviewedBy: string | null; reviewedAt: string | null; reviewNote: string } }> {
  return request<{ report: { id: string; status: ReportStatus; reviewedBy: string | null; reviewedAt: string | null; reviewNote: string } }>(
    `/api/admin/reports/${reportId}/review`,
    { method: "PATCH", body: JSON.stringify(payload) }
  );
}

export async function listAdminAuditLogs(
  limit = 100,
  entityType?: "report" | "user" | "text",
  entityId?: string
): Promise<AdminAuditLog[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (entityType) params.set("entityType", entityType);
  if (entityId) params.set("entityId", entityId);
  const data = await request<{ logs: AdminAuditLog[] }>(`/api/admin/audit-logs?${params.toString()}`);
  return data.logs;
}
