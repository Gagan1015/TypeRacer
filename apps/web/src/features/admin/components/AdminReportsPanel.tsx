import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminReportDetail,
  listAdminReports,
  reviewAdminReport,
  type AdminReport,
  type AdminReportDetail,
  type ReportStatus
} from "@/lib/api/client";

type ReportFilter = ReportStatus | "all";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const statusColors: Record<ReportStatus, string> = {
  open: "border-[#e2b714]/40 bg-[#e2b714]/10 text-[#e2b714]",
  in_review: "border-blue-400/40 bg-blue-400/10 text-blue-400",
  resolved_cheat: "border-[#ca4754]/40 bg-[#ca4754]/10 text-[#ca4754]",
  resolved_clean: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
  dismissed: "border-[#646669]/40 bg-[#646669]/10 text-[#646669]"
};

const statusLabels: Record<ReportStatus, string> = {
  open: "Open",
  in_review: "In Review",
  resolved_cheat: "Cheat",
  resolved_clean: "Clean",
  dismissed: "Dismissed"
};

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function SeverityDot({ severity }: { severity: "low" | "medium" | "high" }) {
  const color = severity === "high" ? "bg-[#ca4754]" : severity === "medium" ? "bg-[#e2b714]" : "bg-[#646669]";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} title={severity} />;
}

function LoadingRows() {
  return (
    <div className="space-y-3 py-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <div className="h-4 w-16 animate-pulse rounded bg-[#2c2e33]" />
          <div className="h-4 w-40 animate-pulse rounded bg-[#2c2e33]" />
          <div className="ml-auto h-4 w-12 animate-pulse rounded bg-[#2c2e33]" />
        </div>
      ))}
    </div>
  );
}

function ReportDetailModal({
  reportId,
  onClose
}: {
  reportId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const detailQuery = useQuery({
    queryKey: ["admin", "report", reportId],
    queryFn: () => getAdminReportDetail(reportId),
    staleTime: 10_000
  });

  const reviewMutation = useMutation({
    mutationFn: (nextStatus: ReportStatus) =>
      reviewAdminReport(reportId, { status: nextStatus, note: reviewNote }),
    onSuccess: () => {
      setActionMsg("Report updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "report", reportId] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (err) => {
      setActionMsg(err instanceof Error ? err.message : "Failed");
    }
  });

  const report: AdminReportDetail | undefined = detailQuery.data;

  const actionButtons: Array<{ status: ReportStatus; label: string; color: string }> = [
    { status: "in_review", label: "Start Review", color: "bg-blue-400/15 text-blue-400 hover:bg-blue-400/25" },
    { status: "resolved_cheat", label: "Confirm Cheat", color: "bg-[#ca4754]/15 text-[#ca4754] hover:bg-[#ca4754]/25" },
    { status: "resolved_clean", label: "Mark Clean", color: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" },
    { status: "dismissed", label: "Dismiss", color: "bg-[#646669]/15 text-[#646669] hover:bg-[#646669]/25" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl bg-[#2c2e33] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#646669]" />
          </div>
        ) : detailQuery.isError ? (
          <p className="text-sm text-[#ca4754]">Failed to load report</p>
        ) : report ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={report.status} />
                  <span className="text-[10px] uppercase text-[#4a4d52]">{report.source}</span>
                </div>
                <p className="mt-2 text-sm text-[#d1d0c5]">{report.summary}</p>
                {report.detail ? (
                  <p className="mt-1 font-mono text-xs text-[#646669]">{report.detail}</p>
                ) : null}
              </div>
              <span className="text-xs text-[#646669]">{formatDate(report.createdAt)}</span>
            </div>

            {/* Target info */}
            <div className="mt-4 rounded-lg bg-[#1e2228] p-3">
              <div className="flex items-center gap-3 text-xs text-[#646669]">
                <span>Target: <span className="text-[#d1d0c5]">{report.targetType}</span></span>
                <span>ID: <span className="font-mono text-[#d1d0c5]">{report.targetId}</span></span>
              </div>
              <div className="mt-1 text-xs text-[#646669]">
                Suspect: <span className="font-mono text-[#d1d0c5]">{report.suspectUserId}</span>
              </div>
            </div>

            {/* Reasons */}
            {report.reasons.length > 0 ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">anti-cheat reasons</p>
                <div className="mt-2 space-y-2">
                  {report.reasons.map((reason, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-[#1e2228] px-3 py-2">
                      <SeverityDot severity={reason.severity} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#d1d0c5]">{reason.code}</span>
                          <span className="text-[10px] text-[#4a4d52]">
                            {Math.round(reason.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#646669]">{reason.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Review info */}
            {report.reviewedBy ? (
              <div className="mt-4 rounded-lg border border-[#3a3d42]/40 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">review</p>
                <p className="mt-1 text-xs text-[#646669]">
                  By: <span className="font-mono text-[#d1d0c5]">{report.reviewedBy}</span>
                  {report.reviewedAt ? ` at ${formatDate(report.reviewedAt)}` : null}
                </p>
                {report.reviewNote ? (
                  <p className="mt-1 text-sm text-[#d1d0c5]">{report.reviewNote}</p>
                ) : null}
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-4 border-t border-[#3a3d42] pt-4">
              <div className="mb-3">
                <label className="text-[10px] uppercase tracking-widest text-[#4a4d52]">review note</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  placeholder="Optional review note..."
                  className="mt-1 w-full resize-none rounded-lg bg-[#1e2228] px-3 py-2 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/30"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {actionButtons
                  .filter((btn) => btn.status !== report.status)
                  .map((btn) => (
                    <button
                      key={btn.status}
                      onClick={() => reviewMutation.mutate(btn.status)}
                      disabled={reviewMutation.isPending}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${btn.color}`}
                    >
                      {btn.label}
                    </button>
                  ))}
              </div>

              {actionMsg ? <p className="mt-2 text-xs text-[#646669]">{actionMsg}</p> : null}
            </div>
          </>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ report, onClick }: { report: AdminReport; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-[#3a3d42]/30 px-4 py-3 text-left transition-colors hover:bg-[#2c2e33]/30"
    >
      <div className="flex items-center gap-3">
        <StatusBadge status={report.status} />
        <div className="min-w-0">
          <p className="truncate text-sm text-[#d1d0c5]">{report.summary}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#4a4d52]">
            <span>{report.source}</span>
            <span>&middot;</span>
            <span>{report.targetType}</span>
            {report.reasons.length > 0 ? (
              <>
                <span>&middot;</span>
                <span>{report.reasons.length} reason{report.reasons.length > 1 ? "s" : ""}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <span className="shrink-0 text-xs text-[#646669]">{formatDate(report.createdAt)}</span>
    </button>
  );
}

export function AdminReportsPanel() {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const reportsQuery = useQuery({
    queryKey: ["admin", "reports", filter],
    queryFn: () => listAdminReports(filter),
    staleTime: 15_000
  });

  const statusFilters: ReportFilter[] = ["all", "open", "in_review", "resolved_cheat", "resolved_clean", "dismissed"];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg bg-[#2c2e33]/50 px-1.5 py-1 self-start w-fit">
        {statusFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === f ? "bg-[#3a3d42] text-[#d1d0c5]" : "text-[#646669] hover:text-[#d1d0c5]"
            }`}
          >
            {f === "all" ? "All" : statusLabels[f]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#3a3d42]/60 bg-[#1e2228]/60">
        {reportsQuery.isLoading ? (
          <LoadingRows />
        ) : reportsQuery.isError ? (
          <div className="px-4 py-8 text-center text-sm text-[#ca4754]/80">Failed to load reports</div>
        ) : (reportsQuery.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-[#3a3d42]">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="mt-3 text-sm text-[#646669]">No reports found</p>
          </div>
        ) : (
          reportsQuery.data?.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              onClick={() => setSelectedReportId(report.id)}
            />
          ))
        )}
      </div>

      {selectedReportId ? (
        <ReportDetailModal reportId={selectedReportId} onClose={() => setSelectedReportId(null)} />
      ) : null}
    </div>
  );
}
