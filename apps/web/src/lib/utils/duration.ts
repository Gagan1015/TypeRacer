export function parseDurationToMs(input: string): number | null {
  const value = input.trim().toLowerCase();
  if (!value) {
    return null;
  }

  const plainNumber = Number(value);
  if (Number.isFinite(plainNumber) && plainNumber > 0) {
    return Math.round(plainNumber * 1000);
  }

  const unitPattern = /(\d+)\s*([hms])/g;
  let match: RegExpExecArray | null = null;
  let totalMs = 0;

  while ((match = unitPattern.exec(value)) !== null) {
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    const multiplier = unit === "h" ? 3_600_000 : unit === "m" ? 60_000 : 1_000;
    totalMs += amount * multiplier;
  }

  if (totalMs <= 0) {
    return null;
  }

  const compact = value.replace(/\s+/g, "");
  const consumedCompact = value.match(unitPattern)?.join("").replace(/\s+/g, "") ?? "";
  if (consumedCompact.length !== compact.length) {
    return null;
  }

  return totalMs;
}

export function clampRaceDurationMs(durationMs: number): number {
  return Math.max(10_000, Math.min(durationMs, 600_000));
}
