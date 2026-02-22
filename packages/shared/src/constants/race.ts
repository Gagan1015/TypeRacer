export const raceModes = ["timed_30", "timed_60", "fixed"] as const;

export type RaceMode = (typeof raceModes)[number];

export const timedModeDurationMs: Record<Extract<RaceMode, "timed_30" | "timed_60">, number> = {
  timed_30: 30_000,
  timed_60: 60_000
};

export const raceTexts = [
  {
    id: "intro-velocity",
    content:
      "Velocity in typing is not only speed. It is the calm rhythm of precise keystrokes repeated with intention under pressure.",
    language: "en"
  },
  {
    id: "focus-lane",
    content:
      "A focused racer does not fight the keyboard. They align posture, breathing, and timing until each word lands without noise.",
    language: "en"
  },
  {
    id: "small-gains",
    content:
      "Small improvements compound quickly. One cleaner session today can become ten extra words per minute by next month.",
    language: "en"
  },
  {
    id: "consistency-beats",
    content:
      "Consistency beats occasional bursts. Reliable accuracy creates real progress, while panic typing burns confidence and control.",
    language: "en"
  },
  {
    id: "clean-input",
    content:
      "Clean input is a competitive advantage. Reducing hesitation and correction time often matters more than typing harder.",
    language: "en"
  },
  {
    id: "rhythm-reset",
    content:
      "When rhythm breaks, reset quickly. Relax your shoulders, read ahead one word, and return to a measured pace.",
    language: "en"
  },
  {
    id: "micro-feedback",
    content:
      "Micro feedback loops make experts. Track each session, compare trends, and use objective data to tune technique.",
    language: "en"
  },
  {
    id: "precision-first",
    content:
      "Precision first, speed second. Fast typing without control is unstable, but controlled typing naturally accelerates.",
    language: "en"
  }
] as const;

export type RaceText = (typeof raceTexts)[number];

