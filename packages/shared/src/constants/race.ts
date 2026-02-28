export const presetTimedRaceModes = ["timed_15", "timed_30", "timed_60", "timed_120"] as const;

export const raceModes = [...presetTimedRaceModes, "timed_custom", "fixed"] as const;

export type RaceMode = (typeof raceModes)[number];
export type PresetTimedRaceMode = (typeof presetTimedRaceModes)[number];

export const raceThemes = ["random", "general", "futuristic", "medieval", "historical", "ww2", "sci_fi"] as const;
export type RaceTheme = (typeof raceThemes)[number];

export const characterProfiles = ["letters", "letters_numbers", "letters_symbols", "all"] as const;
export type CharacterProfile = (typeof characterProfiles)[number];

export const raceDifficulties = ["easy", "normal", "hard"] as const;
export type RaceDifficulty = (typeof raceDifficulties)[number];

export const timedModeDurationMs: Record<PresetTimedRaceMode, number> = {
  timed_15: 15_000,
  timed_30: 30_000,
  timed_60: 60_000,
  timed_120: 120_000
};

export function isPresetTimedRaceMode(mode: RaceMode): mode is PresetTimedRaceMode {
  return (presetTimedRaceModes as readonly string[]).includes(mode);
}

export type RaceText = {
  id: string;
  content: string;
  language: string;
};

export const raceTexts: readonly RaceText[] = [
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
];
