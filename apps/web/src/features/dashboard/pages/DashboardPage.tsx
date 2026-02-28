import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { areEquivalentTypingChars, computeTypingScore, isPresetTimedRaceMode, timedModeDurationMs, type RaceMode } from "@typeracrer/shared";
import { createTypingAttempt, getMyRaceStats, getMyTypingAttempts, getRaceText } from "@/lib/api/client";
import { clampRaceDurationMs, parseDurationToMs } from "@/lib/utils/duration";
import { buildPromptWindow } from "@/lib/utils/prompt-window";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";

const timedOptions: Array<{ value: Extract<RaceMode, "timed_15" | "timed_30" | "timed_60" | "timed_120">; label: string }> = [
  { value: "timed_15", label: "15" },
  { value: "timed_30", label: "30" },
  { value: "timed_60", label: "60" },
  { value: "timed_120", label: "120" }
];

const pbModeOptions: RaceMode[] = ["timed_15", "timed_30", "timed_60", "timed_120", "timed_custom"];

const modeLabels: Record<RaceMode, string> = {
  timed_15: "15s",
  timed_30: "30s",
  timed_60: "60s",
  timed_120: "120s",
  timed_custom: "custom",
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
  useDocumentTitle("Dashboard");
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const finishingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [charsPerLine, setCharsPerLine] = useState(48);

  const [mode, setMode] = useState<RaceMode>("timed_30");
  const [customDurationMs, setCustomDurationMs] = useState(45_000);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState("45");
  const [customDurationError, setCustomDurationError] = useState("");
  const [textVersion, setTextVersion] = useState(0);
  const [status, setStatus] = useState<RaceStatus>("idle");
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastSummary, setLastSummary] = useState("");

  const selectedDurationMs = useMemo(() => {
    if (isPresetTimedRaceMode(mode)) {
      return timedModeDurationMs[mode];
    }
    if (mode === "timed_custom") {
      return customDurationMs;
    }
    return null;
  }, [customDurationMs, mode]);

  const textQuery = useQuery({
    queryKey: ["race", "text", mode, selectedDurationMs, textVersion],
    queryFn: () => getRaceText(mode, selectedDurationMs ?? undefined),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false
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

  const isTimedMode = selectedDurationMs !== null;
  const timedLimitMs = selectedDurationMs;
  const prompt = textQuery.data?.content ?? "";

  const resetRound = useCallback(() => {
    finishingRef.current = false;
    setStatus("idle");
    setTyped("");
    setStartedAt(null);
    setElapsedMs(0);
    setLastSummary("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const newText = useCallback(() => {
    setTextVersion((v) => v + 1);
    resetRound();
  }, [resetRound]);

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
          durationMs,
          targetDurationMs: timedLimitMs ?? undefined
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
    [mode, startedAt, status, submitAttemptMutation, textQuery.data, timedLimitMs, typed]
  );

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    let tabHeld = false;

    function handleKeyDown(e: KeyboardEvent) {
      // Track Tab held state
      if (e.key === "Tab") {
        tabHeld = true;

        // Don't prevent default immediately — wait to see if Enter follows
        // But we do preventDefault to stop focus moving away
        if (status !== "running") {
          e.preventDefault();
        }
        return;
      }

      // Tab + Enter → new text
      if (e.key === "Enter" && tabHeld) {
        e.preventDefault();
        if (status !== "running" && !textQuery.isFetching) {
          newText();
        }
        return;
      }

      // Escape → end test (running) or dismiss results (finished)
      if (e.key === "Escape") {
        e.preventDefault();
        if (status === "running") {
          finishRace();
        } else if (status === "finished") {
          resetRound();
        }
        return;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Tab") {
        // Tab released without Enter → restart same text
        if (tabHeld && status !== "running") {
          resetRound();
        }
        tabHeld = false;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [status, finishRace, resetRound, newText, textQuery.isFetching]);

  useEffect(() => {
    if (!prompt || status === "running") {
      return;
    }
    inputRef.current?.focus();
  }, [prompt, status]);

  // Measure how many monospace chars fit in the container
  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      const span = measureRef.current;
      if (!container || !span) return;
      const containerWidth = container.clientWidth - 16; // account for px-2 padding
      const totalWidth = span.getBoundingClientRect().width;
      const charWidth = totalWidth / 10; // span contains 10 chars
      if (charWidth > 0) {
        setCharsPerLine(Math.max(Math.floor(containerWidth / charWidth) - 2, 20));
      }
    }
    measure();
    // Re-measure once fonts are fully loaded (avoids wrong metrics from fallback font)
    void document.fonts.ready.then(() => measure());
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (status !== "running" || !startedAt || !timedLimitMs) {
      return;
    }

    const interval = window.setInterval(() => {
      const nextElapsed = Date.now() - startedAt;
      setElapsedMs(nextElapsed);

      if (nextElapsed >= timedLimitMs) {
        finishRace(timedLimitMs);
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [finishRace, startedAt, status, timedLimitMs]);

  useEffect(() => {
    if (!textQuery.data || status !== "running" || finishingRef.current) {
      return;
    }

    if (typed.length >= textQuery.data.content.length) {
      const autoDuration = Math.max(Date.now() - (startedAt ?? Date.now()), 1);
      finishRace(autoDuration);
    }
  }, [finishRace, startedAt, status, textQuery.data, typed.length]);

  const previewScore = useMemo(() => {
    if (!prompt) {
      return null;
    }

    const activeDurationMs = Math.max(
      timedLimitMs ? Math.min(elapsedMs, timedLimitMs) : elapsedMs,
      1
    );

    return computeTypingScore({
      prompt,
      typed,
      durationMs: activeDurationMs
    });
  }, [elapsedMs, prompt, timedLimitMs, typed]);

  const remainingMs = timedLimitMs ? Math.max(timedLimitMs - elapsedMs, 0) : 0;
  const showResults = status === "finished" && previewScore;

  const promptWindow = useMemo(() => buildPromptWindow(prompt, typed.length, charsPerLine, 3), [prompt, typed.length, charsPerLine]);

  function selectMode(nextMode: RaceMode): void {
    if (status === "running") {
      return;
    }
    setMode(nextMode);
    setTextVersion((value) => value + 1);
    resetRound();
  }

  function applyCustomDuration(): void {
    const parsedDurationMs = parseDurationToMs(customDurationInput);
    if (!parsedDurationMs) {
      setCustomDurationError("enter a valid duration (for example 45, 90s, 2m, 1m30s)");
      return;
    }

    const nextDuration = clampRaceDurationMs(parsedDurationMs);
    setCustomDurationMs(nextDuration);
    setCustomDurationError("");
    setIsCustomModalOpen(false);

    if (status !== "running") {
      setMode("timed_custom");
      setTextVersion((value) => value + 1);
      resetRound();
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center">
      {/* ── Mode selector bar (Monkeytype style) ── */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1 rounded-xl bg-[#2c2e33]/70 px-3 py-2">
        <span className="mr-1 text-sm text-[#646669]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="inline-block h-4 w-4 align-[-2px]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <span className="mr-2 text-sm text-[#646669]">time</span>
        <span className="mx-1 hidden h-4 w-px bg-[#3a3d42] sm:block" />
        {timedOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => selectMode(option.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
              mode === option.value ? "text-[#e2b714]" : "text-[#646669] hover:text-[#d1d0c5]"
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-[#3a3d42] sm:block" />
        {/* Custom duration button */}
        <button
          onClick={() => {
            if (status === "running") return;
            setCustomDurationInput(String(Math.round(customDurationMs / 1000)));
            setCustomDurationError("");
            setIsCustomModalOpen(true);
          }}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors sm:text-sm ${
            mode === "timed_custom" ? "text-[#e2b714]" : "text-[#646669] hover:text-[#d1d0c5]"
          }`}
          title="custom duration"
        >
          {mode === "timed_custom" ? `${Math.round(customDurationMs / 1000)}s` : "custom"}
        </button>
        <span className="mx-1 hidden h-4 w-px bg-[#3a3d42] sm:block" />
        {/* Fixed mode */}
        <button
          onClick={() => selectMode("fixed")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
            mode === "fixed" ? "text-[#e2b714]" : "text-[#646669] hover:text-[#d1d0c5]"
          }`}
        >
          fixed
        </button>
        <span className="mx-1 hidden h-4 w-px bg-[#3a3d42] sm:block" />
        {/* Refresh button */}
        <button
          onClick={() => {
            if (textQuery.isFetching) return;
            newText();
          }}
          disabled={status === "running" || textQuery.isFetching}
          className="rounded-md p-1 text-[#646669] transition-colors hover:text-[#d1d0c5] disabled:opacity-40"
          title="new text"
          aria-label="Get new text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
        </button>
      </div>

      {/* ── Mode info tags (hidden when results are showing) ── */}
      {!showResults ? (
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
            {mode === "timed_custom" ? `${Math.round(customDurationMs / 1000)}s` : modeLabels[mode]}
          </span>
        </div>
      ) : null}

      {/* ── Typing area (hidden when results are showing) ── */}
      {!showResults ? (
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
          {textQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#646669]" />
            </div>
          ) : null}
          {textQuery.isError ? (
            <p className="text-center font-mono text-xl text-red-400/80">could not load text</p>
          ) : null}

          {!textQuery.isLoading && !textQuery.isError ? (
            <div className="mx-auto w-fit space-y-2 font-mono text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.85] tracking-wide">
              {promptWindow.visibleLines.map((line, lineIndex) => (
                <p key={`${line.start}-${line.end}-${lineIndex}`} className="whitespace-nowrap text-[#646669]">
                  {line.text.split("").map((char, index) => {
                    const globalIndex = line.start + index;
                    const typedChar = typed[globalIndex];
                    const isCurrent = status !== "finished" && globalIndex === typed.length;

                    let className = "text-[#646669] transition-colors duration-75";
                    if (typedChar !== undefined) {
                      className = areEquivalentTypingChars(char, typedChar)
                        ? "text-[#d1d0c5]"
                        : "text-[#ca4754] bg-[#ca4754]/10";
                    } else if (isCurrent) {
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
      ) : null}

      {/* ── Live timer (only while running) ── */}
      {status === "running" ? (
        <div className="mt-6 flex items-center justify-center gap-6 text-[#646669]">
          <span className="font-mono text-lg">{formatMs(isTimedMode ? remainingMs : elapsedMs)}</span>
          <span className="text-xs">{previewScore?.wpm ?? 0} wpm</span>
        </div>
      ) : null}

      {/* ── Results panel (shown after finishing — premium design) ── */}
      {showResults ? (
        <div className="mt-8 w-full animate-results-appear">
          {/* Results card */}
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[#2c2e33] bg-gradient-to-b from-[#2c2e33]/80 to-[#1e2228]/90 px-4 py-6 shadow-2xl shadow-black/30 sm:px-8 sm:py-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e2b714]/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e2b714" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#d1d0c5]">Race Complete</h2>
                <p className="text-xs text-[#646669]">{mode === "timed_custom" ? `${Math.round(customDurationMs / 1000)}s` : modeLabels[mode]} · {previewScore.completed ? "completed" : `${previewScore.progress}% progress`}</p>
              </div>
            </div>

            {/* Hero stats — WPM & Accuracy */}
            <div className="mb-6 flex items-center justify-center gap-6 sm:gap-12">
              <div className="min-w-0 text-center">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#646669] sm:text-xs">wpm</p>
                <p className="font-mono text-3xl font-bold tracking-tight text-[#e2b714] sm:text-5xl lg:text-6xl" style={{ textShadow: '0 0 40px rgba(226, 183, 20, 0.15)' }}>{previewScore.wpm}</p>
              </div>
              <div className="h-12 w-px shrink-0 bg-gradient-to-b from-transparent via-[#3a3d42] to-transparent sm:h-16" />
              <div className="min-w-0 text-center">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-[#646669] sm:text-xs">accuracy</p>
                <p className={`font-mono text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl ${
                  previewScore.accuracy >= 95 ? 'text-emerald-400' : previewScore.accuracy >= 80 ? 'text-amber-400' : 'text-red-400'
                }`} style={{ textShadow: previewScore.accuracy >= 95 ? '0 0 40px rgba(52, 211, 153, 0.15)' : previewScore.accuracy >= 80 ? '0 0 40px rgba(251, 191, 36, 0.15)' : '0 0 40px rgba(248, 113, 113, 0.15)' }}>{previewScore.accuracy}%</p>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-auto mb-5 h-px w-3/4 bg-gradient-to-r from-transparent via-[#3a3d42] to-transparent" />

            {/* Secondary stats row */}
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <div className="rounded-xl bg-[#1e2228]/80 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                <p className="text-[9px] font-medium uppercase tracking-widest text-[#4a4d52] sm:text-[10px]">raw wpm</p>
                <p className="mt-1 font-mono text-lg font-medium text-[#d1d0c5] sm:text-xl">{previewScore.rawWpm}</p>
              </div>
              <div className="rounded-xl bg-[#1e2228]/80 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                <p className="text-[9px] font-medium uppercase tracking-widest text-[#4a4d52] sm:text-[10px]">time</p>
                <p className="mt-1 font-mono text-lg font-medium text-[#d1d0c5] sm:text-xl">{formatMs(elapsedMs)}</p>
              </div>
              <div className="rounded-xl bg-[#1e2228]/80 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                <p className="text-[9px] font-medium uppercase tracking-widest text-[#4a4d52] sm:text-[10px]">correct</p>
                <p className="mt-1 font-mono text-lg font-medium text-emerald-400/90 sm:text-xl">{previewScore.correctChars}</p>
              </div>
              <div className="rounded-xl bg-[#1e2228]/80 px-3 py-2.5 text-center sm:px-4 sm:py-3">
                <p className="text-[9px] font-medium uppercase tracking-widest text-[#4a4d52] sm:text-[10px]">incorrect</p>
                <p className="mt-1 font-mono text-lg font-medium text-red-400/90 sm:text-xl">{previewScore.incorrectChars}</p>
              </div>
            </div>

            {/* Character accuracy bar */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-[#4a4d52]">
                <span>character accuracy</span>
                <span className="text-[#646669]">{previewScore.correctChars}/{previewScore.totalTypedChars} chars</span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#1e2228]">
                {previewScore.totalTypedChars > 0 ? (
                  <>
                    <div
                      className="h-full rounded-l-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                      style={{ width: `${(previewScore.correctChars / previewScore.totalTypedChars) * 100}%` }}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-700"
                      style={{ width: `${(previewScore.incorrectChars / previewScore.totalTypedChars) * 100}%` }}
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-[#3a3d42]" />
                )}
              </div>
            </div>

            {/* Save status */}
            {lastSummary ? (
              <p className="mb-4 text-center text-xs text-[#646669]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block h-3 w-3 align-[-1px]">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                {lastSummary}
              </p>
            ) : null}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <button
                onClick={newText}
                className="flex items-center gap-2 rounded-xl bg-[#e2b714]/10 px-4 py-2 text-sm font-medium text-[#e2b714] transition-all hover:bg-[#e2b714]/20 hover:shadow-lg hover:shadow-[#e2b714]/5 sm:px-5 sm:py-2.5"
              >
                next test
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
              <button
                onClick={resetRound}
                className="flex items-center gap-2 rounded-xl border border-[#3a3d42] px-4 py-2 text-sm text-[#646669] transition-all hover:border-[#4a4d52] hover:text-[#d1d0c5] sm:px-5 sm:py-2.5"
              >
                restart
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Keyboard shortcuts hint (Monkeytype style, desktop only) ── */}
      {status !== "running" && !showResults ? (
        <div className="mt-16 hidden flex-col items-center gap-2 text-[#404347] md:flex">
          <p className="flex items-center gap-2 text-xs">
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">tab</kbd>
            <span>+</span>
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">enter</kbd>
            <span className="ml-1">- new text</span>
          </p>
          <p className="flex items-center gap-2 text-xs">
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">tab</kbd>
            <span className="ml-1">- restart same text</span>
          </p>
          <p className="flex items-center gap-2 text-xs">
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">esc</kbd>
            <span className="ml-1">- end test early</span>
          </p>
        </div>
      ) : null}
      {showResults ? (
        <div className="mt-6 hidden flex-col items-center gap-2 text-[#404347] md:flex">
          <p className="flex items-center gap-2 text-xs">
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">tab</kbd>
            <span>+</span>
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">enter</kbd>
            <span className="ml-1">- next test</span>
          </p>
          <p className="flex items-center gap-2 text-xs">
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">tab</kbd>
            <span className="ml-1">- restart same text</span>
          </p>
          <p className="flex items-center gap-2 text-xs">
            <kbd className="rounded bg-[#2c2e33] px-1.5 py-0.5 font-mono text-[10px] text-[#646669]">esc</kbd>
            <span className="ml-1">- dismiss results</span>
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
                  className={`py-2.5 ${
                    i < (attemptsQuery.data?.length ?? 0) - 1 ? "border-b border-[#3a3d42]/50" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-12 font-mono text-xs text-[#e2b714]">{modeLabels[attempt.mode]}</span>
                      <span className="font-mono text-[#d1d0c5]">{attempt.score.wpm} wpm</span>
                      <span className="font-mono text-[#646669]">{attempt.score.accuracy}%</span>
                    </div>
                    <span className="text-xs text-[#646669]">{formatDate(attempt.createdAt)}</span>
                  </div>
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
                {pbModeOptions.map((pbMode) => (
                  <div key={pbMode} className="flex items-center justify-between py-1">
                    <span className="text-[#646669]">{modeLabels[pbMode]}</span>
                    <span className="font-mono text-[#d1d0c5]">
                      {statsQuery.data?.personalBestByMode[pbMode] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Custom duration modal ── */}
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
