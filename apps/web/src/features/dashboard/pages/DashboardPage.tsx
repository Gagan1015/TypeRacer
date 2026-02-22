import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { computeTypingScore, timedModeDurationMs, type RaceMode } from "@typeracrer/shared";
import { createTypingAttempt, getMyRaceStats, getMyTypingAttempts, getRaceText } from "@/lib/api/client";

const modeOptions: Array<{ value: RaceMode; label: string }> = [
  { value: "timed_30", label: "30" },
  { value: "timed_60", label: "60" },
  { value: "fixed", label: "fixed" }
];

const modeLabels: Record<RaceMode, string> = {
  timed_30: "30s",
  timed_60: "60s",
  fixed: "fixed"
};

type RaceStatus = "idle" | "running" | "finished";

function formatMs(ms: number): string {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const finishingRef = useRef(false);

  const [mode, setMode] = useState<RaceMode>("timed_30");
  const [textVersion, setTextVersion] = useState(0);
  const [status, setStatus] = useState<RaceStatus>("idle");
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastSummary, setLastSummary] = useState("");

  const textQuery = useQuery({
    queryKey: ["race", "text", mode, textVersion],
    queryFn: () => getRaceText(mode),
    staleTime: 0
  });

  const attemptsQuery = useQuery({
    queryKey: ["race", "attempts", "me"],
    queryFn: () => getMyTypingAttempts(4)
  });

  const statsQuery = useQuery({
    queryKey: ["race", "stats", "me"],
    queryFn: () => getMyRaceStats()
  });

  const submitAttemptMutation = useMutation({
    mutationFn: createTypingAttempt,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["race", "attempts", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["race", "stats", "me"] });
    }
  });

  const isTimedMode = mode === "timed_30" || mode === "timed_60";
  const timedLimitMs = isTimedMode ? timedModeDurationMs[mode] : null;
  const prompt = textQuery.data?.content ?? "";

  const beginRace = useCallback(() => {
    if (!prompt || textQuery.isLoading) {
      return;
    }

    finishingRef.current = false;
    setStatus("running");
    setStartedAt(Date.now());
    setElapsedMs(0);
    setLastSummary("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [prompt, textQuery.isLoading]);

  const resetRound = useCallback(() => {
    finishingRef.current = false;
    setStatus("idle");
    setTyped("");
    setStartedAt(null);
    setElapsedMs(0);
    setLastSummary("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const finishRace = useCallback(
    (durationMsOverride?: number) => {
      if (!textQuery.data || status !== "running" || !startedAt || finishingRef.current) {
        return;
      }

      finishingRef.current = true;
      const durationMs = Math.max(durationMsOverride ?? Date.now() - startedAt, 1);
      setElapsedMs(durationMs);
      setStatus("finished");

      if (typed.length === 0) {
        setLastSummary("round ended with no input");
        return;
      }

      submitAttemptMutation.mutate(
        {
          mode,
          textId: textQuery.data.id,
          typed,
          durationMs
        },
        {
          onSuccess: (attempt) => {
            setLastSummary(`saved ${attempt.score.wpm} wpm | ${attempt.score.accuracy}% acc`);
          },
          onError: (error) => {
            setLastSummary(error instanceof Error ? error.message : "could not save attempt");
          }
        }
      );
    },
    [mode, startedAt, status, submitAttemptMutation, textQuery.data, typed]
  );

  useEffect(() => {
    if (!prompt || status === "running") {
      return;
    }
    inputRef.current?.focus();
  }, [prompt, status]);

  useEffect(() => {
    if (status !== "running" || !startedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      const nextElapsed = Date.now() - startedAt;
      setElapsedMs(nextElapsed);

      if (isTimedMode && timedLimitMs && nextElapsed >= timedLimitMs) {
        finishRace(timedLimitMs);
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [finishRace, isTimedMode, startedAt, status, timedLimitMs]);

  useEffect(() => {
    if (!textQuery.data || mode !== "fixed" || status !== "running" || finishingRef.current) {
      return;
    }

    if (typed.length >= textQuery.data.content.length) {
      finishRace();
    }
  }, [finishRace, mode, status, textQuery.data, typed.length]);

  const previewScore = useMemo(() => {
    if (!prompt) {
      return null;
    }

    const activeDurationMs = Math.max(
      isTimedMode && timedLimitMs ? Math.min(elapsedMs, timedLimitMs) : elapsedMs,
      1
    );

    return computeTypingScore({
      prompt,
      typed,
      durationMs: activeDurationMs
    });
  }, [elapsedMs, isTimedMode, prompt, timedLimitMs, typed]);

  const remainingMs = isTimedMode && timedLimitMs ? Math.max(timedLimitMs - elapsedMs, 0) : 0;

  const showResults = status === "finished" && previewScore;

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center">
      {/* ── Mode selector bar (Monkeytype style) ── */}
      <div className="mt-2 flex items-center justify-center gap-1 rounded-xl bg-[#2c2e33]/70 px-3 py-2">
        <span className="mr-1 text-sm text-[#646669]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="inline-block h-4 w-4 align-[-2px]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <span className="mr-2 text-sm text-[#646669]">time</span>
        <span className="mx-1 h-4 w-px bg-[#3a3d42]" />
        {modeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              if (status === "running") return;
              setMode(option.value);
              setTextVersion((v) => v + 1);
              resetRound();
            }}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              mode === option.value
                ? "text-[#e2b714]"
                : "text-[#646669] hover:text-[#d1d0c5]"
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[#3a3d42]" />
        <button
          onClick={() => {
            setTextVersion((v) => v + 1);
            resetRound();
          }}
          disabled={status === "running"}
          className="rounded-md p-1 text-[#646669] transition-colors hover:text-[#d1d0c5] disabled:opacity-40"
          title="new text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
        </button>
      </div>

      {/* ── Mode info tags ── */}
      <div className="mt-4 flex items-center justify-center gap-5 text-sm">
        <span className="flex items-center gap-1.5 text-[#646669]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          repeated
        </span>
        <span className="flex items-center gap-1.5 text-[#646669]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          english
        </span>
        <span className="flex items-center gap-1.5 text-[#646669]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {modeLabels[mode]}
        </span>
      </div>

      {/* ── Typing area (main focus) ── */}
      <div
        className="relative mt-10 w-full cursor-text px-2"
        onClick={() => inputRef.current?.focus()}
        style={{ minHeight: "180px" }}
      >
        {textQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="typing-loader">
              <span className="inline-block h-2 w-2 rounded-full bg-[#646669] animate-pulse" />
            </div>
          </div>
        ) : null}
        {textQuery.isError ? (
          <p className="text-center font-mono text-xl text-red-400/80">could not load text</p>
        ) : null}
        {!textQuery.isLoading && !textQuery.isError ? (
          <p className="font-mono text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.85] tracking-wide text-[#646669]">
            {prompt.split("").map((char, index) => {
              const typedChar = typed[index];
              const isCurrent = status !== "finished" && index === typed.length;

              let className = "text-[#646669] transition-colors duration-75";
              if (typedChar !== undefined) {
                className = typedChar === char ? "text-[#d1d0c5]" : "text-[#ca4754] bg-[#ca4754]/10";
              } else if (isCurrent) {
                className = "border-l-2 border-[#e2b714] pl-[1px] text-[#646669] animate-caret-blink";
              }

              return (
                <span key={`${index}-${char}`} className={className}>
                  {char}
                </span>
              );
            })}
          </p>
        ) : null}

        <textarea
          ref={inputRef}
          value={typed}
          onChange={(event) => {
            if (status === "finished") return;
            const clean = event.target.value.replace(/\r?\n/g, " ");
            const nextTyped = clean.slice(0, prompt.length);
            if (nextTyped.length > 0 && status !== "running") {
              setStatus("running");
              setStartedAt(Date.now());
              setElapsedMs(0);
              finishingRef.current = false;
            }
            setTyped(nextTyped);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && status === "running") {
              event.preventDefault();
              finishRace();
            }
          }}
          className="absolute inset-0 h-full w-full resize-none border-0 bg-transparent opacity-0 outline-none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>

      {/* ── Live timer (only while running) ── */}
      {status === "running" ? (
        <div className="mt-6 flex items-center justify-center gap-6 text-[#646669]">
          <span className="font-mono text-lg">{formatMs(isTimedMode ? remainingMs : elapsedMs)}</span>
          <span className="text-xs">{previewScore?.wpm ?? 0} wpm</span>
        </div>
      ) : null}

      {/* ── Results panel (shown after finishing, Monkeytype style) ── */}
      {showResults ? (
        <div className="mt-8 w-full animate-fade-in">
          <div className="flex flex-wrap items-end justify-center gap-10 py-4">
            <div className="text-center">
              <p className="text-sm text-[#646669]">wpm</p>
              <p className="font-mono text-5xl font-light text-[#e2b714]">{previewScore.wpm}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#646669]">acc</p>
              <p className="font-mono text-5xl font-light text-[#e2b714]">{previewScore.accuracy}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#646669]">raw</p>
              <p className="font-mono text-3xl text-[#646669]">{previewScore.rawWpm}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#646669]">time</p>
              <p className="font-mono text-3xl text-[#646669]">{formatMs(elapsedMs)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[#646669]">progress</p>
              <p className="font-mono text-3xl text-[#646669]">{previewScore.progress}%</p>
            </div>
          </div>
          {lastSummary ? (
            <p className="mt-1 text-center text-xs text-[#646669]">{lastSummary}</p>
          ) : null}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                setTextVersion((v) => v + 1);
                resetRound();
              }}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]"
            >
              next test
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Keyboard shortcuts hint (Monkeytype style) ── */}
      {status !== "running" && !showResults ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-[#404347]">
          <p className="flex items-center gap-2 text-xs">
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">tab</kbd>
            <span>+</span>
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">enter</kbd>
            <span className="ml-1">- restart test</span>
          </p>
          <p className="flex items-center gap-2 text-xs">
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">esc</kbd>
            <span className="ml-1">- end test</span>
          </p>
        </div>
      ) : null}

      {/* ── Stats section (below, subtle) ── */}
      {status !== "running" ? (
        <div className="mt-12 grid w-full gap-6 lg:grid-cols-[1.8fr_1fr]">
          {/* Recent attempts */}
          <div className="rounded-lg bg-[#2c2e33]/50 p-5">
            <h3 className="mb-3 text-sm font-medium text-[#646669]">recent attempts</h3>
            <div className="space-y-0 text-sm">
              {attemptsQuery.isLoading ? <p className="text-[#646669]">loading...</p> : null}
              {!attemptsQuery.isLoading && (attemptsQuery.data?.length ?? 0) === 0 ? (
                <p className="text-[#646669]">no attempts yet — start typing to begin</p>
              ) : null}
              {attemptsQuery.data?.map((attempt, i) => (
                <div
                  key={attempt.id}
                  className={`flex items-center justify-between py-2.5 ${
                    i < (attemptsQuery.data?.length ?? 0) - 1 ? "border-b border-[#3a3d42]/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-10 font-mono text-xs text-[#e2b714]">{modeLabels[attempt.mode]}</span>
                    <span className="font-mono text-[#d1d0c5]">{attempt.score.wpm} wpm</span>
                    <span className="font-mono text-[#646669]">{attempt.score.accuracy}%</span>
                  </div>
                  <span className="text-xs text-[#646669]">{formatDate(attempt.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personal best */}
          <div className="rounded-lg bg-[#2c2e33]/50 p-5">
            <h3 className="mb-3 text-sm font-medium text-[#646669]">personal best</h3>
            <div className="space-y-0 text-sm">
              <div className="flex items-center justify-between border-b border-[#3a3d42]/50 py-2.5">
                <span className="text-[#646669]">best wpm</span>
                <span className="font-mono text-[#d1d0c5]">{statsQuery.data?.bestWpm ?? 0}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#3a3d42]/50 py-2.5">
                <span className="text-[#646669]">best accuracy</span>
                <span className="font-mono text-[#d1d0c5]">{statsQuery.data?.bestAccuracy ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#3a3d42]/50 py-2.5">
                <span className="text-[#646669]">avg wpm</span>
                <span className="font-mono text-[#d1d0c5]">{statsQuery.data?.averageWpm ?? 0}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#3a3d42]/50 py-2.5">
                <span className="text-[#646669]">attempts</span>
                <span className="font-mono text-[#d1d0c5]">{statsQuery.data?.attemptsCount ?? 0}</span>
              </div>
              <div className="mt-3">
                <p className="mb-2 text-xs uppercase tracking-widest text-[#4a4d52]">mode pbs</p>
                {modeOptions.map((option) => (
                  <div key={option.value} className="flex items-center justify-between py-1">
                    <span className="text-[#646669]">{modeLabels[option.value]}</span>
                    <span className="font-mono text-[#d1d0c5]">
                      {statsQuery.data?.personalBestByMode[option.value] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

