import { useQuery } from "@tanstack/react-query";
import { listAdminAuditLogs, type AdminAuditLog } from "@/lib/api/client";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

const actionColors: Record<string, string> = {
  USER_BANNED: "border-[#ca4754]/30 bg-[#ca4754]/10 text-[#ca4754]",
  USER_UNBANNED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  REPORT_REVIEWED: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  TEXT_CREATED: "border-[#e2b714]/30 bg-[#e2b714]/10 text-[#e2b714]",
  TEXT_UPDATED: "border-[#e2b714]/30 bg-[#e2b714]/10 text-[#e2b714]"
};

const entityTypeIcons: Record<string, React.ReactNode> = {
  user: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  report: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  ),
  text: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  )
};

function LoadingRows() {
  return (
    <div className="space-y-3 py-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <div className="h-4 w-20 animate-pulse rounded bg-[#2c2e33]" />
          <div className="h-4 w-32 animate-pulse rounded bg-[#2c2e33]" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-[#2c2e33]" />
        </div>
      ))}
    </div>
  );
}

function AuditLogRow({ log }: { log: AdminAuditLog }) {
  const colorClass = actionColors[log.action] ?? "border-[#646669]/30 bg-[#646669]/10 text-[#646669]";

  return (
    <div className="flex items-center justify-between border-b border-[#3a3d42]/30 px-4 py-3 transition-colors hover:bg-[#2c2e33]/20">
      <div className="flex items-center gap-3">
        <span className="text-[#646669]">
          {entityTypeIcons[log.entityType] ?? null}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${colorClass}`}>
              {log.action.replace(/_/g, " ")}
            </span>
            <span className="font-mono text-xs text-[#646669]">{log.entityType}/{log.entityId.slice(0, 10)}</span>
          </div>
          {Object.keys(log.metadata).length > 0 ? (
            <p className="mt-0.5 font-mono text-[10px] text-[#4a4d52]">
              {Object.entries(log.metadata)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([k, v]) => `${k}=${String(v)}`)
                .join(", ")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-[#646669]">{formatDate(log.createdAt)}</p>
        <p className="mt-0.5 font-mono text-[10px] text-[#4a4d52]">by {log.actorUserId.slice(0, 10)}</p>
      </div>
    </div>
  );
}

export function AdminAuditLogsPanel() {
  const logsQuery = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => listAdminAuditLogs(100),
    staleTime: 15_000
  });

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-[#3a3d42]/60 bg-[#1e2228]/60">
        {logsQuery.isLoading ? (
          <LoadingRows />
        ) : logsQuery.isError ? (
          <div className="px-4 py-8 text-center text-sm text-[#ca4754]/80">Failed to load audit logs</div>
        ) : (logsQuery.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-[#3a3d42]">
              <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
            </svg>
            <p className="mt-3 text-sm text-[#646669]">No audit log entries yet</p>
          </div>
        ) : (
          logsQuery.data?.map((log) => <AuditLogRow key={log.id} log={log} />)
        )}
      </div>

      {logsQuery.data && logsQuery.data.length > 0 ? (
        <p className="mt-2 text-right text-[10px] text-[#4a4d52]">
          showing {logsQuery.data.length} entries
        </p>
      ) : null}
    </div>
  );
}
