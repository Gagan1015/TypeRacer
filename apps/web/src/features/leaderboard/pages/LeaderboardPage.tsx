import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RaceMode, RankedMatchRecord } from "@typeracrer/shared";
import {
  getCurrentSeason,
  getGlobalTypingLeaderboard,
  getMyRankedHistory,
  getMyRankedProfile,
  getRankedLeaderboard,
  getSeasonalTypingLeaderboard
} from "@/lib/api/client";
import { useAuthStore } from "@/lib/state/auth-store";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";

type LeaderboardTab = "typing" | "ranked";
type TypingScope = "global" | "seasonal";

const modeOptions: Array<{ value: Extract<RaceMode, "timed_15" | "timed_30" | "timed_60" | "timed_120">; label: string }> = [
  { value: "timed_15", label: "15s" },
  { value: "timed_30", label: "30s" },
  { value: "timed_60", label: "60s" },
  { value: "timed_120", label: "120s" }
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#e2b714]/20 font-mono text-xs font-bold text-[#e2b714]">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#b0b0b0]/15 font-mono text-xs font-bold text-[#b0b0b0]">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#cd7f32]/15 font-mono text-xs font-bold text-[#cd7f32]">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center font-mono text-xs text-[#646669]">
      {rank}
    </span>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  if (delta > 0) {
    return <span className="font-mono text-xs text-emerald-400">+{delta}</span>;
  }
  if (delta < 0) {
    return <span className="font-mono text-xs text-[#ca4754]">{delta}</span>;
  }
  return <span className="font-mono text-xs text-[#646669]">0</span>;
}

function OutcomeBadge({ outcome }: { outcome: "win" | "loss" | "draw" }) {
  const config = {
    win: { text: "W", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
    loss: { text: "L", color: "text-[#ca4754] bg-[#ca4754]/10 border-[#ca4754]/30" },
    draw: { text: "D", color: "text-[#646669] bg-[#646669]/10 border-[#646669]/30" }
  };
  const c = config[outcome];
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded border text-[10px] font-bold ${c.color}`}>
      {c.text}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-[#3a3d42]">
        <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      </svg>
      <p className="mt-3 text-sm text-[#646669]">{message}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 py-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <div className="h-7 w-7 animate-pulse rounded-full bg-[#2c2e33]" />
          <div className="h-4 w-24 animate-pulse rounded bg-[#2c2e33]" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-[#2c2e33]" />
        </div>
      ))}
    </div>
  );
}

function MatchHistoryRow({ match, userId }: { match: RankedMatchRecord; userId: string }) {
  const myGlobalDelta = match.globalDeltas.find((d) => d.userId === userId);
  const mySeasonalDelta = match.seasonalDeltas.find((d) => d.userId === userId);
  const delta = myGlobalDelta ?? mySeasonalDelta;

  if (!delta) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-[#3a3d42]/40 px-4 py-3 transition-colors hover:bg-[#2c2e33]/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-3">
        <OutcomeBadge outcome={delta.outcome} />
        <div>
          <span className="text-sm text-[#d1d0c5]">
            #{delta.place} of {match.participantCount}
          </span>
          <span className="ml-3 text-xs text-[#646669]">{match.mode}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="font-mono text-sm text-[#d1d0c5]">{delta.newRating}</span>
          <span className="ml-2">
            <DeltaChip delta={delta.delta} />
          </span>
        </div>
        <span className="text-xs text-[#646669]">{formatDateTime(match.playedAt)}</span>
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  useDocumentTitle("Leaderboard");
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<LeaderboardTab>("typing");
  const [typingScope, setTypingScope] = useState<TypingScope>("global");
  const [mode, setMode] = useState<RaceMode>("timed_30");
  const [rankedScope, setRankedScope] = useState<"global" | "seasonal">("global");

  const seasonQuery = useQuery({
    queryKey: ["leaderboard", "season", "current"],
    queryFn: getCurrentSeason,
    staleTime: 60_000
  });

  const globalTypingQuery = useQuery({
    queryKey: ["leaderboard", "typing", "global", mode],
    queryFn: () => getGlobalTypingLeaderboard(mode),
    enabled: tab === "typing" && typingScope === "global",
    staleTime: 30_000
  });

  const seasonalTypingQuery = useQuery({
    queryKey: ["leaderboard", "typing", "seasonal", mode, seasonQuery.data?.id],
    queryFn: () => getSeasonalTypingLeaderboard(mode, 50, seasonQuery.data?.id),
    enabled: tab === "typing" && typingScope === "seasonal" && !!seasonQuery.data,
    staleTime: 30_000
  });

  const rankedLbQuery = useQuery({
    queryKey: ["leaderboard", "ranked", rankedScope],
    queryFn: () => getRankedLeaderboard(rankedScope),
    enabled: tab === "ranked",
    staleTime: 30_000
  });

  const rankedProfileQuery = useQuery({
    queryKey: ["ranked", "profile", "me"],
    queryFn: () => getMyRankedProfile(),
    enabled: tab === "ranked" && !!user,
    staleTime: 30_000
  });

  const rankedHistoryQuery = useQuery({
    queryKey: ["ranked", "history", "me"],
    queryFn: () => getMyRankedHistory(15),
    enabled: tab === "ranked" && !!user,
    staleTime: 30_000
  });

  const typingLeaderboard = typingScope === "global" ? globalTypingQuery : seasonalTypingQuery;

  const currentUserRankedEntry = useMemo(() => {
    if (!user || !rankedLbQuery.data) return null;
    return rankedLbQuery.data.entries.find((e) => e.userId === user.id) ?? null;
  }, [rankedLbQuery.data, user]);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col">
      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#d1d0c5]">
            Leaderboard
          </h1>
          {seasonQuery.data ? (
            <p className="mt-1 text-xs text-[#646669]">
              Season {seasonQuery.data.id} &middot; {formatDate(seasonQuery.data.startsAt)} – {formatDate(seasonQuery.data.endsAt)}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="mt-5 flex items-center gap-1 rounded-xl bg-[#2c2e33]/70 px-2 py-1.5 self-start">
        <button
          onClick={() => setTab("typing")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "typing" ? "bg-[#e2b714]/15 text-[#e2b714]" : "text-[#646669] hover:text-[#d1d0c5]"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.001" /><path d="M10 8h.001" /><path d="M14 8h.001" /><path d="M18 8h.001" /><path d="M8 12h.001" /><path d="M12 12h.001" /><path d="M16 12h.001" /><path d="M7 16h10" /></svg>
            Typing
          </span>
        </button>
        <button
          onClick={() => setTab("ranked")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "ranked" ? "bg-[#e2b714]/15 text-[#e2b714]" : "text-[#646669] hover:text-[#d1d0c5]"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
            Ranked
          </span>
        </button>
      </div>

      {/* ── Typing Leaderboard ── */}
      {tab === "typing" ? (
        <div className="mt-5 animate-fade-in">
          {/* Scope + mode controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-[#2c2e33]/50 px-1.5 py-1">
              <button
                onClick={() => setTypingScope("global")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  typingScope === "global" ? "bg-[#3a3d42] text-[#d1d0c5]" : "text-[#646669] hover:text-[#d1d0c5]"
                }`}
              >
                Global
              </button>
              <button
                onClick={() => setTypingScope("seasonal")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  typingScope === "seasonal" ? "bg-[#3a3d42] text-[#d1d0c5]" : "text-[#646669] hover:text-[#d1d0c5]"
                }`}
              >
                Seasonal
              </button>
            </div>

            <span className="h-4 w-px bg-[#3a3d42]" />

            <div className="flex items-center gap-1">
              {modeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    mode === opt.value ? "text-[#e2b714]" : "text-[#646669] hover:text-[#d1d0c5]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-xl border border-[#3a3d42]/60 bg-[#1e2228]/60">
            {/* Header row */}
            <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] gap-2 border-b border-[#3a3d42]/60 px-4 py-2.5 text-xs uppercase tracking-widest text-[#4a4d52] sm:grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem]">
              <span>#</span>
              <span>player</span>
              <span className="text-right">best</span>
              <span className="text-right">avg</span>
              <span className="hidden text-right sm:block">acc</span>
              <span className="hidden text-right sm:block">runs</span>
            </div>

            {typingLeaderboard.isLoading ? <LoadingRows /> : null}

            {typingLeaderboard.isError ? (
              <div className="px-4 py-8 text-center text-sm text-[#ca4754]/80">
                Failed to load leaderboard
              </div>
            ) : null}

            {!typingLeaderboard.isLoading && (typingLeaderboard.data?.entries.length ?? 0) === 0 ? (
              <EmptyState message="No entries yet — be the first on the board" />
            ) : null}

            {typingLeaderboard.data?.entries.map((entry, i) => {
              const isMe = user?.id === entry.userId;
              return (
                <div
                  key={entry.userId}
                  className={`grid grid-cols-[2.5rem_1fr_4rem_4rem] items-center gap-2 px-4 py-2.5 text-sm transition-colors sm:grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem] ${
                    i < (typingLeaderboard.data?.entries.length ?? 0) - 1 ? "border-b border-[#3a3d42]/30" : ""
                  } ${isMe ? "bg-[#e2b714]/[0.04]" : "hover:bg-[#2c2e33]/30"}`}
                >
                  <RankBadge rank={entry.rank} />
                  <span className={`truncate font-mono ${isMe ? "text-[#e2b714]" : "text-[#d1d0c5]"}`}>
                    {entry.username}
                    {isMe ? <span className="ml-1.5 text-[10px] text-[#e2b714]/60">(you)</span> : null}
                  </span>
                  <span className="text-right font-mono text-[#d1d0c5]">{entry.bestWpm}</span>
                  <span className="text-right font-mono text-[#646669]">{entry.averageWpm}</span>
                  <span className="hidden text-right font-mono text-[#646669] sm:block">{entry.bestAccuracy}%</span>
                  <span className="hidden text-right font-mono text-[#646669] sm:block">{entry.attemptsCount}</span>
                </div>
              );
            })}
          </div>

          {typingLeaderboard.data ? (
            <p className="mt-2 text-right text-[10px] text-[#4a4d52]">
              generated {formatDateTime(typingLeaderboard.data.generatedAt)}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── Ranked Leaderboard ── */}
      {tab === "ranked" ? (
        <div className="mt-5 animate-fade-in">
          {/* My ranked profile card */}
          {user && rankedProfileQuery.data ? (
            <div className="mb-5 rounded-xl border border-[#3a3d42]/60 bg-[#1e2228]/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-[#646669]">your ranked profile</h3>
                  <div className="mt-3 flex items-end gap-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">global rating</p>
                      <p className="mt-1 font-mono text-3xl font-light text-[#e2b714]">
                        {rankedProfileQuery.data.global.rating}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">seasonal rating</p>
                      <p className="mt-1 font-mono text-3xl font-light text-[#d1d0c5]">
                        {rankedProfileQuery.data.seasonal.rating}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-center sm:gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">played</p>
                    <p className="mt-1 font-mono text-lg text-[#d1d0c5]">{rankedProfileQuery.data.global.gamesPlayed}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">wins</p>
                    <p className="mt-1 font-mono text-lg text-emerald-400">{rankedProfileQuery.data.global.wins}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">losses</p>
                    <p className="mt-1 font-mono text-lg text-[#ca4754]">{rankedProfileQuery.data.global.losses}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">draws</p>
                    <p className="mt-1 font-mono text-lg text-[#646669]">{rankedProfileQuery.data.global.draws}</p>
                  </div>
                  {currentUserRankedEntry ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">rank</p>
                      <p className="mt-1 font-mono text-lg text-[#e2b714]">#{currentUserRankedEntry.rank}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* Scope toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-[#2c2e33]/50 px-1.5 py-1">
              <button
                onClick={() => setRankedScope("global")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  rankedScope === "global" ? "bg-[#3a3d42] text-[#d1d0c5]" : "text-[#646669] hover:text-[#d1d0c5]"
                }`}
              >
                Global
              </button>
              <button
                onClick={() => setRankedScope("seasonal")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  rankedScope === "seasonal" ? "bg-[#3a3d42] text-[#d1d0c5]" : "text-[#646669] hover:text-[#d1d0c5]"
                }`}
              >
                Seasonal
              </button>
            </div>
          </div>

          {/* Ranked table */}
          <div className="mt-4 overflow-hidden rounded-xl border border-[#3a3d42]/60 bg-[#1e2228]/60">
            <div className="grid grid-cols-[2.5rem_1fr_4rem_3rem_3rem] gap-2 border-b border-[#3a3d42]/60 px-4 py-2.5 text-xs uppercase tracking-widest text-[#4a4d52] sm:grid-cols-[3rem_1fr_5rem_4rem_4rem_4rem_5rem]">
              <span>#</span>
              <span>player</span>
              <span className="text-right">rating</span>
              <span className="text-right">W</span>
              <span className="text-right">L</span>
              <span className="hidden text-right sm:block">D</span>
              <span className="hidden text-right sm:block">win%</span>
            </div>

            {rankedLbQuery.isLoading ? <LoadingRows /> : null}

            {rankedLbQuery.isError ? (
              <div className="px-4 py-8 text-center text-sm text-[#ca4754]/80">
                Failed to load ranked leaderboard
              </div>
            ) : null}

            {!rankedLbQuery.isLoading && (rankedLbQuery.data?.entries.length ?? 0) === 0 ? (
              <EmptyState message="No ranked matches played yet" />
            ) : null}

            {rankedLbQuery.data?.entries.map((entry, i) => {
              const isMe = user?.id === entry.userId;
              return (
                <div
                  key={entry.userId}
                  className={`grid grid-cols-[2.5rem_1fr_4rem_3rem_3rem] items-center gap-2 px-4 py-2.5 text-sm transition-colors sm:grid-cols-[3rem_1fr_5rem_4rem_4rem_4rem_5rem] ${
                    i < (rankedLbQuery.data?.entries.length ?? 0) - 1 ? "border-b border-[#3a3d42]/30" : ""
                  } ${isMe ? "bg-[#e2b714]/[0.04]" : "hover:bg-[#2c2e33]/30"}`}
                >
                  <RankBadge rank={entry.rank} />
                  <span className={`truncate font-mono ${isMe ? "text-[#e2b714]" : "text-[#d1d0c5]"}`}>
                    {entry.username}
                    {isMe ? <span className="ml-1.5 text-[10px] text-[#e2b714]/60">(you)</span> : null}
                  </span>
                  <span className="text-right font-mono font-medium text-[#d1d0c5]">{entry.rating}</span>
                  <span className="text-right font-mono text-emerald-400">{entry.wins}</span>
                  <span className="text-right font-mono text-[#ca4754]">{entry.losses}</span>
                  <span className="hidden text-right font-mono text-[#646669] sm:block">{entry.draws}</span>
                  <span className="hidden text-right font-mono text-[#646669] sm:block">{entry.winRate}%</span>
                </div>
              );
            })}
          </div>

          {rankedLbQuery.data ? (
            <p className="mt-2 text-right text-[10px] text-[#4a4d52]">
              generated {formatDateTime(rankedLbQuery.data.generatedAt)}
            </p>
          ) : null}

          {/* Match history */}
          {user && rankedHistoryQuery.data && rankedHistoryQuery.data.length > 0 ? (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium text-[#646669]">recent match history</h3>
              <div className="overflow-hidden rounded-xl border border-[#3a3d42]/60 bg-[#1e2228]/60">
                {rankedHistoryQuery.data.map((match) => (
                  <MatchHistoryRow key={match.id} match={match} userId={user.id} />
                ))}
              </div>
            </div>
          ) : null}

          {user && rankedHistoryQuery.isLoading ? (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium text-[#646669]">recent match history</h3>
              <LoadingRows />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
