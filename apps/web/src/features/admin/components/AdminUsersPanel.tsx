import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminUserDetail,
  listAdminUsers,
  updateUserModeration,
  type AdminUserDetail
} from "@/lib/api/client";
import { useDebounce } from "@/lib/utils/use-debounce";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function BannedBadge({ banned }: { banned: boolean }) {
  if (!banned) return null;
  return (
    <span className="rounded border border-[#ca4754]/30 bg-[#ca4754]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#ca4754]">
      banned
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="rounded border border-[#e2b714]/30 bg-[#e2b714]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#e2b714]">
        admin
      </span>
    );
  }
  return null;
}

function LoadingRows() {
  return (
    <div className="space-y-3 py-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <div className="h-4 w-24 animate-pulse rounded bg-[#2c2e33]" />
          <div className="h-4 w-32 animate-pulse rounded bg-[#2c2e33]" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-[#2c2e33]" />
        </div>
      ))}
    </div>
  );
}

function UserDetailModal({
  userId,
  onClose
}: {
  userId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [banReason, setBanReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const detailQuery = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => getAdminUserDetail(userId),
    staleTime: 10_000
  });

  const moderationMutation = useMutation({
    mutationFn: (payload: { isBanned: boolean; reason?: string }) =>
      updateUserModeration(userId, payload),
    onSuccess: () => {
      setActionMsg("Moderation updated");
      setBanReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
      setActionMsg(err instanceof Error ? err.message : "Failed");
    }
  });

  const detail: AdminUserDetail | undefined = detailQuery.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[#2c2e33] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#646669]" />
          </div>
        ) : detailQuery.isError ? (
          <p className="text-sm text-[#ca4754]">Failed to load user</p>
        ) : detail ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-mono text-lg text-[#d1d0c5]">{detail.user.username}</h3>
                <p className="mt-0.5 text-xs text-[#646669]">{detail.user.email}</p>
                <p className="mt-0.5 text-xs text-[#646669]">Joined {formatDate(detail.user.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <RoleBadge role={detail.user.role} />
                <BannedBadge banned={detail.user.isBanned} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#1e2228] p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">attempts</p>
                <p className="mt-1 font-mono text-lg text-[#d1d0c5]">{detail.moderation.attemptsCount}</p>
              </div>
              <div className="rounded-lg bg-[#1e2228] p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">suspicious</p>
                <p className={`mt-1 font-mono text-lg ${detail.moderation.suspiciousAttemptsCount > 0 ? "text-[#ca4754]" : "text-[#d1d0c5]"}`}>
                  {detail.moderation.suspiciousAttemptsCount}
                </p>
              </div>
              <div className="rounded-lg bg-[#1e2228] p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">open reports</p>
                <p className={`mt-1 font-mono text-lg ${detail.moderation.openReportsCount > 0 ? "text-[#e2b714]" : "text-[#d1d0c5]"}`}>
                  {detail.moderation.openReportsCount}
                </p>
              </div>
            </div>

            {detail.user.isBanned && detail.user.banReason ? (
              <div className="mt-3 rounded-lg border border-[#ca4754]/20 bg-[#ca4754]/5 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">ban reason</p>
                <p className="mt-1 text-sm text-[#ca4754]">{detail.user.banReason}</p>
                {detail.user.bannedAt ? (
                  <p className="mt-1 text-[10px] text-[#646669]">Banned {formatDate(detail.user.bannedAt)}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 border-t border-[#3a3d42] pt-4">
              {detail.user.isBanned ? (
                <button
                  onClick={() => moderationMutation.mutate({ isBanned: false })}
                  disabled={moderationMutation.isPending}
                  className="rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
                >
                  {moderationMutation.isPending ? "Unbanning..." : "Unban User"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Ban reason (required)"
                    className="flex-1 rounded-lg bg-[#1e2228] px-3 py-2 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#ca4754]/40"
                  />
                  <button
                    onClick={() => {
                      if (banReason.trim()) {
                        moderationMutation.mutate({ isBanned: true, reason: banReason.trim() });
                      }
                    }}
                    disabled={!banReason.trim() || moderationMutation.isPending}
                    className="rounded-lg bg-[#ca4754]/15 px-4 py-2 text-sm font-medium text-[#ca4754] transition-colors hover:bg-[#ca4754]/25 disabled:opacity-40"
                  >
                    {moderationMutation.isPending ? "Banning..." : "Ban User"}
                  </button>
                </div>
              )}
              {actionMsg ? <p className="mt-2 text-xs text-[#646669]">{actionMsg}</p> : null}
            </div>

            {detail.profile ? (
              <div className="mt-4 border-t border-[#3a3d42] pt-4">
                <p className="text-[10px] uppercase tracking-widest text-[#4a4d52]">profile</p>
                <div className="mt-2 space-y-1 text-sm text-[#646669]">
                  <p>Display: <span className="text-[#d1d0c5]">{detail.profile.displayName || "—"}</span></p>
                  <p>Layout: <span className="text-[#d1d0c5]">{detail.profile.keyboardLayout}</span></p>
                  {detail.profile.bio ? <p>Bio: <span className="text-[#d1d0c5]">{detail.profile.bio}</span></p> : null}
                </div>
              </div>
            ) : null}
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

export function AdminUsersPanel() {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", debouncedSearch],
    queryFn: () => listAdminUsers(debouncedSearch || undefined),
    staleTime: 15_000
  });

  return (
    <div>
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="w-full rounded-lg bg-[#1e2228] px-4 py-2.5 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/30 md:max-w-md"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#3a3d42]/60 bg-[#1e2228]/60">
        {/* Desktop table header */}
        <div className="hidden grid-cols-[1fr_1.2fr_5rem_5rem_8rem] gap-2 border-b border-[#3a3d42]/60 px-4 py-2.5 text-xs uppercase tracking-widest text-[#4a4d52] md:grid">
          <span>username</span>
          <span>email</span>
          <span className="text-center">role</span>
          <span className="text-center">status</span>
          <span className="text-right">joined</span>
        </div>

        {usersQuery.isLoading ? (
          <LoadingRows />
        ) : usersQuery.isError ? (
          <div className="px-4 py-8 text-center text-sm text-[#ca4754]/80">Failed to load users</div>
        ) : (usersQuery.data?.length ?? 0) === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#646669]">No users found</div>
        ) : (
          usersQuery.data?.map((user, i) => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`w-full px-4 py-3 text-left transition-colors hover:bg-[#2c2e33]/40 md:py-2.5 ${
                i < (usersQuery.data?.length ?? 0) - 1 ? "border-b border-[#3a3d42]/30" : ""
              }`}
            >
              {/* Mobile card layout */}
              <div className="flex flex-col gap-1 md:hidden">
                <div className="flex items-center justify-between">
                  <span className="truncate font-mono text-sm text-[#d1d0c5]">{user.username}</span>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={user.role} />
                    <BannedBadge banned={user.isBanned} />
                  </div>
                </div>
                <span className="truncate text-xs text-[#646669]">{user.email}</span>
                <span className="text-[10px] text-[#4a4d52]">{formatDate(user.createdAt)}</span>
              </div>
              {/* Desktop grid layout */}
              <div className="hidden grid-cols-[1fr_1.2fr_5rem_5rem_8rem] items-center gap-2 text-sm md:grid">
                <span className="truncate font-mono text-[#d1d0c5]">{user.username}</span>
                <span className="truncate text-[#646669]">{user.email}</span>
                <span className="text-center"><RoleBadge role={user.role} /></span>
                <span className="text-center"><BannedBadge banned={user.isBanned} /></span>
                <span className="text-right text-xs text-[#646669]">{formatDate(user.createdAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedUserId ? (
        <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      ) : null}
    </div>
  );
}
