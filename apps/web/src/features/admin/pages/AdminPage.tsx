import { useState } from "react";
import { useAuthStore } from "@/lib/state/auth-store";
import { AdminUsersPanel } from "../components/AdminUsersPanel";
import { AdminTextsPanel } from "../components/AdminTextsPanel";
import { AdminReportsPanel } from "../components/AdminReportsPanel";
import { AdminAuditLogsPanel } from "../components/AdminAuditLogsPanel";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";

type AdminTab = "users" | "texts" | "reports" | "audit";

const tabs: Array<{ key: AdminTab; label: string; icon: React.ReactNode }> = [
  {
    key: "users",
    label: "Users",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    key: "texts",
    label: "Texts",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    )
  },
  {
    key: "reports",
    label: "Reports",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
      </svg>
    )
  },
  {
    key: "audit",
    label: "Audit Log",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
        <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      </svg>
    )
  }
];

export function AdminPage() {
  useDocumentTitle("Admin");
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<AdminTab>("reports");

  if (!user || user.role !== "admin") {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center py-24">
        <div className="rounded-xl border border-[#ca4754]/30 bg-[#ca4754]/5 px-6 py-4 text-center">
          <p className="text-sm text-[#ca4754]">You do not have admin access.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-[#d1d0c5] sm:text-2xl">
            Admin Panel
          </h1>
          <p className="mt-1 text-xs text-[#646669]">
            Manage users, texts, reports &amp; audit logs
          </p>
        </div>
        <span className="w-fit rounded-md border border-[#e2b714]/30 bg-[#e2b714]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#e2b714]">
          admin
        </span>
      </div>

      {/* Tab bar */}
      <div className="mt-5 flex flex-wrap items-center gap-1 self-start rounded-xl bg-[#2c2e33]/70 px-2 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              tab === t.key
                ? "bg-[#e2b714]/15 text-[#e2b714]"
                : "text-[#646669] hover:text-[#d1d0c5]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {t.icon}
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="mt-5 animate-fade-in">
        {tab === "users" ? <AdminUsersPanel /> : null}
        {tab === "texts" ? <AdminTextsPanel /> : null}
        {tab === "reports" ? <AdminReportsPanel /> : null}
        {tab === "audit" ? <AdminAuditLogsPanel /> : null}
      </div>
    </section>
  );
}
