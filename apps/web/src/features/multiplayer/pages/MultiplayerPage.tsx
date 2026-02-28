import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  areEquivalentTypingChars,
  computeTypingScore,
  isPresetTimedRaceMode,
  timedModeDurationMs,
  type MultiplayerRaceResult,
  type MultiplayerRoomState,
  type RaceMode
} from "@typeracrer/shared";
import type { Socket } from "socket.io-client";
import { createMultiplayerSocket } from "@/lib/socket/multiplayer-client";
import { useAuthStore } from "@/lib/state/auth-store";
import { clampRaceDurationMs, parseDurationToMs } from "@/lib/utils/duration";
import { buildPromptWindow } from "@/lib/utils/prompt-window";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";

type ConnectionState = "connecting" | "connected" | "disconnected";

const timedOptions: Array<{
  value: Extract<RaceMode, "timed_15" | "timed_30" | "timed_60" | "timed_120">;
  label: string;
}> = [
  { value: "timed_15", label: "15" },
  { value: "timed_30", label: "30" },
  { value: "timed_60", label: "60" },
  { value: "timed_120", label: "120" }
];

const modeLabels: Record<RaceMode, string> = {
  timed_15: "15s",
  timed_30: "30s",
  timed_60: "60s",
  timed_120: "120s",
  timed_custom: "custom",
  fixed: "fixed"
};

const placeLabels = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
const placeMedals = ["🏆", "🥈", "🥉"];

function formatMs(ms: number): string {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function roomModeLabel(room: MultiplayerRoomState): string {
  if (room.mode === "timed_custom" && room.raceDurationMs) {
    return `${Math.round(room.raceDurationMs / 1000)}s`;
  }
  return modeLabels[room.mode];
}

function PlayerProgressBar({
  player,
  isYou,
  isHost,
  showReady
}: {
  player: MultiplayerRoomState["players"][number];
  isYou: boolean;
  isHost: boolean;
  showReady: boolean;
}) {
  return (
    <div className="group relative">
      <div className="flex items-center gap-3">
        {/* Avatar circle with ready indicator */}
        <div className="relative shrink-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold uppercase ${
              isYou
                ? "border border-[#e2b714]/60 bg-[#e2b714]/15 text-[#e2b714]"
                : "border border-[#3a3d42] bg-[#2c2e33] text-[#646669]"
            }`}
          >
            {player.username.slice(0, 2)}
          </div>
          {/* Ready dot indicator */}
          {showReady ? (
            <span
              className={`absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-[#25282f] ${
                player.ready ? "bg-emerald-400" : "bg-[#4a4d52]"
              }`}
              title={player.ready ? "Ready" : "Not ready"}
            />
          ) : null}
        </div>

        {/* Name + track */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className={`truncate text-sm ${isYou ? "font-medium text-[#d1d0c5]" : "text-[#646669]"}`}>
                {player.username}
              </span>
              {isYou ? <span className="text-[10px] text-[#e2b714]">(you)</span> : null}
              {isHost ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-[#e2b714]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#e2b714]" title="Room host">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  host
                </span>
              ) : null}
              {showReady ? (
                <span className={`text-[10px] font-medium ${
                  player.ready ? "text-emerald-400" : "text-[#4a4d52]"
                }`}>
                  {player.ready ? "ready" : "not ready"}
                </span>
              ) : null}
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-[#d1d0c5]">
                {player.wpm} <span className="text-[#646669]">wpm</span>
              </span>
              {player.place !== null ? (
                <span className="font-mono text-[#e2b714]">
                  {placeMedals[player.place - 1] ?? ""}{" "}
                  {placeLabels[player.place - 1] ?? `#${player.place}`}
                </span>
              ) : (
                <span className="font-mono text-[#646669]">{player.progress}%</span>
              )}
            </div>
          </div>

          {/* Progress track */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#2c2e33]">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out ${
                player.place !== null
                  ? player.place === 1
                    ? "bg-[#e2b714]"
                    : "bg-[#646669]"
                  : isYou
                    ? "bg-[#e2b714]/70"
                    : "bg-[#4a4d52]"
              }`}
              style={{ width: `${Math.min(player.progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MultiplayerPage() {
  useDocumentTitle("Multiplayer");
  const socketRef = useRef<Socket | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const finishSentRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const user = useAuthStore((state) => state.user);

  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const [room, setRoom] = useState<MultiplayerRoomState | null>(null);
  const [results, setResults] = useState<MultiplayerRaceResult[]>([]);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [createMode, setCreateMode] = useState<RaceMode>("timed_30");
  const [customCreateDurationMs, setCustomCreateDurationMs] = useState(45_000);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState("45");
  const [customDurationError, setCustomDurationError] = useState("");
  const [typed, setTyped] = useState("");
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [charsPerLine, setCharsPerLine] = useState(48);

  useEffect(() => {
    const socket = createMultiplayerSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnection("connected");
      setErrorMessage("");
    };

    const onDisconnect = () => {
      setConnection("disconnected");
    };

    const onConnectError = () => {
      setConnection("disconnected");
      setErrorMessage("socket auth failed, refresh session and retry");
    };

    const onRoomState = (payload: { room: MultiplayerRoomState }) => {
      setRoom(payload.room);
      if (payload.room.status !== "racing") {
        setStartedAtMs(null);
        setDurationMs(0);
        setElapsedMs(0);
        finishSentRef.current = false;
      }
      if (payload.room.status === "waiting" && payload.room.prompt === null) {
        setTyped("");
      }
    };

    const onStarted = (payload: { room: MultiplayerRoomState; startedAtMs: number; durationMs: number }) => {
      setRoom(payload.room);
      setResults([]);
      setTyped("");
      setStartedAtMs(payload.startedAtMs);
      setDurationMs(payload.durationMs);
      setElapsedMs(0);
      finishSentRef.current = false;
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    const onFinished = (payload: { room: MultiplayerRoomState; results: MultiplayerRaceResult[] }) => {
      setRoom(payload.room);
      setResults(payload.results);
      setStartedAtMs(null);
      setDurationMs(0);
      finishSentRef.current = false;
    };

    const onRoomClosed = (payload: { roomId: string }) => {
      setRoom((current) => (current?.id === payload.roomId ? null : current));
      setResults([]);
      setTyped("");
    };

    const onSocketError = (payload: { code: string; message: string }) => {
      setErrorMessage(payload.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("race:room_state", onRoomState);
    socket.on("race:started", onStarted);
    socket.on("race:finished", onFinished);
    socket.on("race:room_closed", onRoomClosed);
    socket.on("race:error", onSocketError);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("race:room_state", onRoomState);
      socket.off("race:started", onStarted);
      socket.off("race:finished", onFinished);
      socket.off("race:room_closed", onRoomClosed);
      socket.off("race:error", onSocketError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!room || room.status !== "racing" || !startedAtMs || durationMs <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      const nextElapsed = Math.max(Date.now() - startedAtMs, 0);
      setElapsedMs(nextElapsed);

      if (nextElapsed >= durationMs && !finishSentRef.current) {
        finishSentRef.current = true;
        socketRef.current?.emit("race:finish", { typed, elapsedMs: durationMs });
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [durationMs, room, startedAtMs, typed]);

  // Measure how many monospace chars fit in the container (same as single player)
  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      const span = measureRef.current;
      if (!container || !span) return;
      const containerWidth = container.clientWidth - 16;
      const totalWidth = span.getBoundingClientRect().width;
      const charWidth = totalWidth / 10;
      if (charWidth > 0) {
        setCharsPerLine(Math.max(Math.floor(containerWidth / charWidth) - 2, 20));
      }
    }
    measure();
    void document.fonts.ready.then(() => measure());
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const prompt = room?.prompt ?? "";
  const me = useMemo(
    () => room?.players.find((player) => player.userId === user?.id) ?? null,
    [room?.players, user?.id]
  );

  const previewScore = useMemo(() => {
    if (!prompt) {
      return null;
    }

    const mode = room?.mode ?? "timed_30";
    const cap =
      isPresetTimedRaceMode(mode) ? timedModeDurationMs[mode] : mode === "timed_custom" ? durationMs : elapsedMs;
    const activeDurationMs = Math.max(Math.min(elapsedMs, cap), 1);

    return computeTypingScore({
      prompt,
      typed,
      durationMs: activeDurationMs
    });
  }, [durationMs, elapsedMs, prompt, room?.mode, typed]);

  const remainingMs = useMemo(() => {
    if (!room || room.status !== "racing") {
      return 0;
    }
    if (room.raceDurationMs !== null) {
      return Math.max(room.raceDurationMs - elapsedMs, 0);
    }
    return elapsedMs;
  }, [elapsedMs, room]);

  const activeResults = results.length
    ? results
    : (room?.players
        .filter((player) => player.place !== null)
        .map((player) => ({
          userId: player.userId,
          username: player.username,
          place: player.place ?? 0,
          finishedAtMs: player.finishedAtMs,
          score: {
            wpm: player.wpm,
            rawWpm: player.wpm,
            accuracy: player.accuracy,
            correctChars: 0,
            incorrectChars: 0,
            totalTypedChars: 0,
            progress: player.progress,
            completed: false,
            durationMs: player.finishedAtMs ?? 0
          }
        }))
        .sort((a, b) => a.place - b.place) ?? []);

  const winner = activeResults.find((r) => r.place === 1);
  const myResult = activeResults.find((r) => r.userId === user?.id);
  const iAmWinner = myResult?.place === 1;

  const promptWindow = useMemo(() => buildPromptWindow(prompt, typed.length, charsPerLine, 3), [prompt, typed.length, charsPerLine]);

  const createRoom = useCallback(() => {
    setErrorMessage("");
    if (createMode === "timed_custom") {
      socketRef.current?.emit("race:create_room", { mode: createMode, customDurationMs: customCreateDurationMs });
      return;
    }
    socketRef.current?.emit("race:create_room", { mode: createMode });
  }, [createMode, customCreateDurationMs]);

  const joinRoom = useCallback(() => {
    const normalized = joinRoomId.trim().toLowerCase();
    if (!normalized) {
      setErrorMessage("enter a room id");
      return;
    }
    setErrorMessage("");
    socketRef.current?.emit("race:join_room", { roomId: normalized });
  }, [joinRoomId]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("race:leave_room");
    setRoom(null);
    setResults([]);
    setTyped("");
    setElapsedMs(0);
    setStartedAtMs(null);
    setDurationMs(0);
    finishSentRef.current = false;
  }, []);

  const toggleReady = useCallback(() => {
    if (!me) return;
    socketRef.current?.emit("race:set_ready", { ready: !me.ready });
  }, [me]);

  const onType = useCallback(
    (value: string) => {
      if (!room || room.status !== "racing" || !prompt || me?.place !== null) {
        return;
      }

      const clean = value.replace(/\r?\n/g, " ").slice(0, prompt.length);
      setTyped(clean);

      const raceElapsed = Math.max(startedAtMs ? Date.now() - startedAtMs : elapsedMs, 1);
      socketRef.current?.emit("race:progress", { typed: clean, elapsedMs: raceElapsed });

      if (clean.length >= prompt.length && !finishSentRef.current) {
        finishSentRef.current = true;
        socketRef.current?.emit("race:finish", { typed: clean, elapsedMs: raceElapsed });
      }
    },
    [elapsedMs, me?.place, prompt, room, startedAtMs]
  );

  function applyCustomDuration(): void {
    const parsed = parseDurationToMs(customDurationInput);
    if (!parsed) {
      setCustomDurationError("enter valid duration: 45, 90s, 2m, 1m30s");
      return;
    }

    const nextDuration = clampRaceDurationMs(parsed);
    setCustomCreateDurationMs(nextDuration);
    setCustomDurationError("");
    setCreateMode("timed_custom");
    setIsCustomModalOpen(false);
  }

  /* ─── Lobby (no room joined yet) ─── */
  if (!room) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center">
        {/* Header bar */}
        <div className="flex w-full items-center justify-between rounded-xl bg-[#2c2e33]/70 px-5 py-3">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#e2b714]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h2 className="text-lg font-medium text-[#d1d0c5]">multiplayer</h2>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              connection === "connected"
                ? "text-emerald-400"
                : connection === "connecting"
                  ? "text-amber-300"
                  : "text-red-400"
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${
              connection === "connected"
                ? "bg-emerald-400"
                : connection === "connecting"
                  ? "bg-amber-300 animate-pulse"
                  : "bg-red-400"
            }`} />
            {connection}
          </span>
        </div>

        {errorMessage ? (
          <p className="mt-4 w-full rounded-lg bg-[#ca4754]/10 px-4 py-2 text-sm text-[#ca4754]">{errorMessage}</p>
        ) : null}

        <div className="mt-8 grid w-full gap-6 md:grid-cols-2">
          {/* Create room card */}
          <div className="rounded-xl bg-[#2c2e33]/50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#e2b714]"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <p className="text-sm font-medium text-[#d1d0c5]">create room</p>
            </div>

            {/* Mode selector */}
            <div className="flex items-center gap-1 rounded-lg bg-[#1e2228] px-2 py-1.5">
              <span className="mr-1 text-xs text-[#646669]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="inline-block h-3.5 w-3.5 align-[-2px]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              {timedOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCreateMode(option.value)}
                  className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                    createMode === option.value
                      ? "text-[#e2b714]"
                      : "text-[#646669] hover:text-[#d1d0c5]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <span className="mx-0.5 h-3.5 w-px bg-[#3a3d42]" />
              <button
                onClick={() => {
                  setCustomDurationInput(String(Math.round(customCreateDurationMs / 1000)));
                  setCustomDurationError("");
                  setIsCustomModalOpen(true);
                }}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  createMode === "timed_custom"
                    ? "text-[#e2b714]"
                    : "text-[#646669] hover:text-[#d1d0c5]"
                }`}
              >
                {createMode === "timed_custom" ? `${Math.round(customCreateDurationMs / 1000)}s` : "custom"}
              </button>
            </div>

            <button
              onClick={createRoom}
              disabled={connection !== "connected"}
              className="mt-5 w-full rounded-lg bg-[#e2b714]/15 px-4 py-2.5 text-sm font-medium text-[#e2b714] transition-colors hover:bg-[#e2b714]/25 disabled:opacity-40"
            >
              create room
            </button>
          </div>

          {/* Join room card */}
          <div className="rounded-xl bg-[#2c2e33]/50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#646669]"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              <p className="text-sm font-medium text-[#d1d0c5]">join room</p>
            </div>

            <input
              value={joinRoomId}
              onChange={(event) => setJoinRoomId(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") joinRoom(); }}
              placeholder="enter room id"
              className="w-full rounded-lg bg-[#1e2228] px-4 py-2.5 font-mono text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/40"
            />

            <button
              onClick={joinRoom}
              disabled={connection !== "connected"}
              className="mt-5 w-full rounded-lg border border-[#3a3d42] px-4 py-2.5 text-sm text-[#d1d0c5] transition-colors hover:border-[#646669] hover:text-white disabled:opacity-40"
            >
              join room
            </button>
          </div>
        </div>

        {/* Hint */}
        <div className="mt-12 flex flex-col items-center gap-2 text-[#404347]">
          <p className="text-xs">create a room and share the id, or join an existing one</p>
        </div>

        {/* Custom duration modal */}
        {isCustomModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setIsCustomModalOpen(false)}>
            <div className="w-full max-w-sm rounded-xl bg-[#2c2e33] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-medium text-[#d1d0c5]">custom duration</h3>
              <p className="mt-1 text-xs text-[#646669]">seconds, minutes, or mixed (e.g. 45, 90s, 2m, 1m30s)</p>

              <input
                value={customDurationInput}
                onChange={(event) => setCustomDurationInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyCustomDuration();
                  if (event.key === "Escape") setIsCustomModalOpen(false);
                }}
                className="mt-4 w-full rounded-lg bg-[#1e2228] px-4 py-2.5 font-mono text-lg text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/40"
                placeholder="45"
                autoFocus
              />

              {customDurationError ? (
                <p className="mt-2 text-xs text-[#ca4754]">{customDurationError}</p>
              ) : null}

              <div className="mt-5 flex gap-2">
                <button
                  onClick={applyCustomDuration}
                  className="flex-1 rounded-lg bg-[#e2b714]/15 px-4 py-2 text-sm font-medium text-[#e2b714] transition-colors hover:bg-[#e2b714]/25"
                >
                  apply
                </button>
                <button
                  onClick={() => setIsCustomModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]"
                >
                  cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  /* ─── In-room view ─── */
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center">
      {/* Room header bar */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl bg-[#2c2e33]/70 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#e2b714]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="font-mono text-sm text-[#d1d0c5]">{room.id}</span>
          </div>
          <span className="hidden h-4 w-px bg-[#3a3d42] sm:block" />
          <span className="flex items-center gap-1.5 text-sm text-[#646669]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {roomModeLabel(room)}
          </span>
          <span className="hidden h-4 w-px bg-[#3a3d42] sm:block" />
          <span
            className={`text-sm font-medium capitalize ${
              room.status === "waiting"
                ? "text-[#646669]"
                : room.status === "countdown"
                  ? "text-[#e2b714]"
                  : room.status === "racing"
                    ? "text-cyan-400"
                    : "text-emerald-400"
            }`}
          >
            {room.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {room.status !== "racing" ? (
            <button
              onClick={toggleReady}
              className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-all ${
                me?.ready
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                  : "animate-ready-pulse border-[#e2b714]/40 bg-[#e2b714]/10 text-[#e2b714] hover:bg-[#e2b714]/20"
              }`}
            >
              {me?.ready ? (
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M20 6 9 17l-5-5"/></svg>
                  ready
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#e2b714] animate-pulse" />
                  set ready
                </span>
              )}
            </button>
          ) : null}
          <button
            onClick={leaveRoom}
            className="rounded-lg border border-[#3a3d42] px-3 py-1.5 text-sm text-[#646669] transition-all hover:border-[#ca4754]/40 hover:bg-[#ca4754]/10 hover:text-[#ca4754]"
          >
            leave
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-3 w-full rounded-lg bg-[#ca4754]/10 px-4 py-2 text-sm text-[#ca4754]">{errorMessage}</p>
      ) : null}

      {/* ── Player progress lanes (hidden during racing and finished) ── */}
      {room.status !== "racing" && room.status !== "finished" ? (
        <div className="mt-6 w-full space-y-3">
          {room.players.map((player) => (
            <PlayerProgressBar
              key={player.userId}
              player={player}
              isYou={player.userId === user?.id}
              isHost={player.userId === room.hostUserId}
              showReady={room.status === "waiting" || room.status === "finished"}
            />
          ))}
        </div>
      ) : null}

      {/* ── Countdown ── */}
      {room.status === "countdown" ? (
        <div className="mt-10 flex flex-col items-center animate-fade-in">
          <p className="text-xs uppercase tracking-[0.25em] text-[#646669]">race starts in</p>
          <p className="mt-3 font-mono text-7xl font-light text-[#e2b714]">{room.countdownSecondsLeft ?? 0}</p>
          <div className="mt-4 h-1 w-24 overflow-hidden rounded-full bg-[#2c2e33]">
            <div
              className="h-full rounded-full bg-[#e2b714] transition-all duration-1000 ease-linear"
              style={{ width: `${((3 - (room.countdownSecondsLeft ?? 0)) / 3) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* ── Waiting hint ── */}
      {room.status === "waiting" ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-[#404347]">
          <p className="text-sm">waiting for players to ready up</p>
          <p className="flex items-center gap-2 text-xs">
            <span>share room id</span>
            <kbd className="rounded bg-[#2c2e33] px-2 py-0.5 font-mono text-[11px] text-[#646669]">{room.id}</kbd>
          </p>
        </div>
      ) : null}

      {/* ── Racing: typing area ── */}
      {room.status === "racing" && room.prompt ? (
        <>
          {/* Live timer */}
          <div className="mt-6 flex items-center justify-center gap-6 text-[#646669]">
            <span className="font-mono text-lg">
              {room.raceDurationMs !== null ? formatMs(remainingMs) : formatMs(elapsedMs)}
            </span>
            <span className="text-xs">{previewScore?.wpm ?? 0} wpm</span>
            <span className="text-xs">{previewScore?.accuracy ?? 100}%</span>
          </div>

          {/* Typing surface (matching single player layout) */}
          <div
            ref={containerRef}
            className="relative mt-10 w-full cursor-text overflow-hidden px-2"
            onClick={() => inputRef.current?.focus()}
            style={{ minHeight: "220px" }}
          >
            {/* Hidden measurement span for monospace char width */}
            <span
              ref={measureRef}
              className="pointer-events-none invisible absolute font-mono text-[clamp(1.4rem,2.4vw,2rem)] tracking-wide"
              aria-hidden="true"
            >
              MMMMMMMMMM
            </span>

            <div className="mx-auto w-fit space-y-2 font-mono text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.85] tracking-wide">
              {promptWindow.visibleLines.map((line, lineIndex) => (
                <p key={`${line.start}-${line.end}-${lineIndex}`} className="whitespace-nowrap text-[#646669]">
                  {line.text.split("").map((char, index) => {
                    const globalIndex = line.start + index;
                    const typedChar = typed[globalIndex];
                    const isCurrent = globalIndex === typed.length;

                    let className = "text-[#646669] transition-colors duration-75";
                    if (typedChar !== undefined) {
                      className = areEquivalentTypingChars(char, typedChar)
                        ? "text-[#d1d0c5]"
                        : "text-[#ca4754] bg-[#ca4754]/10";
                    } else if (isCurrent && me?.place === null) {
                      className = "border-l-2 border-[#e2b714] pl-[1px] text-[#646669] animate-caret-blink";
                    }

                    return (
                      <span key={`${globalIndex}-${char}`} className={className}>
                        {char}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>

            <textarea
              ref={inputRef}
              value={typed}
              onChange={(event) => onType(event.target.value)}
              className="absolute inset-0 h-full w-full resize-none border-0 bg-transparent opacity-0 outline-none"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        </>
      ) : null}

      {/* ── Results (finished state — premium design) ── */}
      {room.status === "finished" ? (
        <div className="mt-8 w-full animate-results-appear">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[#2c2e33] bg-gradient-to-b from-[#2c2e33]/80 to-[#1e2228]/90 px-4 py-6 shadow-2xl shadow-black/30 sm:px-8 sm:py-8">
            {/* Winner banner */}
            {winner ? (
              <div className="mb-6 text-center">
                {iAmWinner ? (
                  <>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl">🏆</span>
                      <h3 className="bg-gradient-to-r from-[#e2b714] to-[#f5e17d] bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                        victory!
                      </h3>
                      <span className="text-3xl">🏆</span>
                    </div>
                    <p className="mt-1 text-xs text-[#646669]">you finished first — well played!</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl">🏆</span>
                      <h3 className="text-xl font-semibold text-[#e2b714]">{winner.username} wins!</h3>
                    </div>
                    {myResult ? (
                      <p className="mt-1 text-xs text-[#646669]">
                        you placed {placeLabels[myResult.place - 1] ?? `#${myResult.place}`} — keep practicing!
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {/* Hero stats — WPM, Accuracy, Place */}
            {myResult ? (
              <>
                <div className="mb-6 flex items-center justify-center gap-6 sm:gap-10">
                  <div className="min-w-0 text-center">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#646669] sm:text-xs">wpm</p>
                    <p className="font-mono text-3xl font-bold tracking-tight text-[#e2b714] sm:text-5xl" style={{ textShadow: '0 0 40px rgba(226, 183, 20, 0.15)' }}>{myResult.score.wpm}</p>
                  </div>
                  <div className="h-12 w-px shrink-0 bg-gradient-to-b from-transparent via-[#3a3d42] to-transparent sm:h-16" />
                  <div className="min-w-0 text-center">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#646669] sm:text-xs">accuracy</p>
                    <p className={`font-mono text-3xl font-bold tracking-tight sm:text-5xl ${
                      myResult.score.accuracy >= 95 ? 'text-emerald-400' : myResult.score.accuracy >= 80 ? 'text-amber-400' : 'text-red-400'
                    }`} style={{ textShadow: myResult.score.accuracy >= 95 ? '0 0 40px rgba(52, 211, 153, 0.15)' : myResult.score.accuracy >= 80 ? '0 0 40px rgba(251, 191, 36, 0.15)' : '0 0 40px rgba(248, 113, 113, 0.15)' }}>{myResult.score.accuracy}%</p>
                  </div>
                  <div className="h-12 w-px shrink-0 bg-gradient-to-b from-transparent via-[#3a3d42] to-transparent sm:h-16" />
                  <div className="min-w-0 text-center">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#646669] sm:text-xs">place</p>
                    <p className="font-mono text-3xl font-bold tracking-tight text-[#e2b714] sm:text-5xl">
                      {placeLabels[myResult.place - 1] ?? `#${myResult.place}`}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-auto mb-5 h-px w-3/4 bg-gradient-to-r from-transparent via-[#3a3d42] to-transparent" />

                {/* Secondary stats */}
                <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-xl bg-[#1e2228]/80 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                    <p className="text-[9px] font-medium uppercase tracking-widest text-[#4a4d52] sm:text-[10px]">raw wpm</p>
                    <p className="mt-1 font-mono text-lg font-medium text-[#d1d0c5] sm:text-xl">{myResult.score.rawWpm}</p>
                  </div>
                  <div className="rounded-xl bg-[#1e2228]/80 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                    <p className="text-[9px] font-medium uppercase tracking-widest text-[#4a4d52] sm:text-[10px]">progress</p>
                    <p className="mt-1 font-mono text-lg font-medium text-[#d1d0c5] sm:text-xl">{myResult.score.progress}%</p>
                  </div>
                  <div className="rounded-xl bg-[#1e2228]/80 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                    <p className="text-[9px] font-medium uppercase tracking-widest text-[#4a4d52] sm:text-[10px]">time</p>
                    <p className="mt-1 font-mono text-lg font-medium text-[#d1d0c5] sm:text-xl">{myResult.score.durationMs ? formatMs(myResult.score.durationMs) : "—"}</p>
                  </div>
                </div>
              </>
            ) : null}

            {/* Leaderboard */}
            <div className="mb-6 rounded-xl bg-[#1e2228]/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#646669" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M12 20v-6M6 20V10M18 20v-4"/>
                </svg>
                <h3 className="text-xs font-medium uppercase tracking-widest text-[#646669]">leaderboard</h3>
              </div>
              <div className="space-y-0 text-sm">
                {activeResults.map((result, i) => {
                  const isMe = result.userId === user?.id;
                  return (
                    <div
                      key={result.userId}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                        i < activeResults.length - 1 ? "mb-0.5" : ""
                      } ${isMe ? "bg-[#e2b714]/8" : "hover:bg-[#2c2e33]/50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2c2e33] text-center font-mono text-xs">
                          {i < 3 ? placeMedals[i] : <span className="text-[#646669]">{result.place}</span>}
                        </span>
                        <span className={`font-medium ${isMe ? "text-[#e2b714]" : "text-[#d1d0c5]"}`}>
                          {result.username}
                          {isMe ? <span className="ml-1.5 text-[10px] text-[#e2b714]/60">(you)</span> : null}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="font-mono text-[#d1d0c5]">
                          {result.score.wpm} <span className="text-[#4a4d52]">wpm</span>
                        </span>
                        <span className={`font-mono ${
                          result.score.accuracy >= 95 ? 'text-emerald-400/70' : result.score.accuracy >= 80 ? 'text-amber-400/70' : 'text-red-400/70'
                        }`}>{result.score.accuracy}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <button
                onClick={toggleReady}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all sm:px-5 sm:py-2.5 ${
                  me?.ready
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    : "animate-ready-pulse border border-[#e2b714]/40 bg-[#e2b714]/10 text-[#e2b714] hover:bg-[#e2b714]/20"
                }`}
              >
                {me?.ready ? (
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M20 6 9 17l-5-5"/></svg>
                    ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    play again
                  </span>
                )}
              </button>
              <button
                onClick={leaveRoom}
                className="flex items-center gap-2 rounded-xl border border-[#3a3d42] px-4 py-2 text-sm text-[#646669] transition-all hover:border-[#ca4754]/40 hover:bg-[#ca4754]/10 hover:text-[#ca4754] sm:px-5 sm:py-2.5"
              >
                leave room
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
