export type ReportStatus = "open" | "in_review" | "resolved_cheat" | "resolved_clean" | "dismissed";

export function isValidReportTransition(current: ReportStatus, next: ReportStatus): boolean {
  if (current === next) {
    return true;
  }

  if (current === "open") {
    return ["in_review", "resolved_cheat", "resolved_clean", "dismissed"].includes(next);
  }
  if (current === "in_review") {
    return ["resolved_cheat", "resolved_clean", "dismissed", "open"].includes(next);
  }
  return ["in_review", "dismissed"].includes(next);
}
