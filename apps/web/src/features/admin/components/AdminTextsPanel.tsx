import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminText,
  listAdminTexts,
  updateAdminText,
  type AdminText
} from "@/lib/api/client";

type TextFilter = "all" | "active" | "inactive";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-[#646669]"}`}
      title={active ? "Active" : "Inactive"}
    />
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 py-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <div className="h-4 w-16 animate-pulse rounded bg-[#2c2e33]" />
          <div className="h-4 w-48 animate-pulse rounded bg-[#2c2e33]" />
          <div className="ml-auto h-4 w-12 animate-pulse rounded bg-[#2c2e33]" />
        </div>
      ))}
    </div>
  );
}

function CreateTextModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("en");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: { content: string; language: string; key?: string } = {
        content: content.trim(),
        language: language.trim()
      };
      if (key.trim()) payload.key = key.trim();
      return createAdminText(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "texts"] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create text");
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-[#2c2e33] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-medium text-[#d1d0c5]">Add New Race Text</h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#4a4d52]">key (optional)</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="my-custom-text"
              className="mt-1 w-full rounded-lg bg-[#1e2228] px-3 py-2 font-mono text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#4a4d52]">content (40–1200 chars)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="The quick brown fox..."
              className="mt-1 w-full resize-none rounded-lg bg-[#1e2228] px-3 py-2 text-sm text-[#d1d0c5] outline-none placeholder:text-[#4a4d52] focus:ring-1 focus:ring-[#e2b714]/30"
            />
            <p className="mt-0.5 text-right text-[10px] text-[#4a4d52]">{content.length} chars</p>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#4a4d52]">language</label>
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-20 rounded-lg bg-[#1e2228] px-3 py-2 font-mono text-sm text-[#d1d0c5] outline-none focus:ring-1 focus:ring-[#e2b714]/30"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-xs text-[#ca4754]">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => createMutation.mutate()}
            disabled={content.trim().length < 40 || createMutation.isPending}
            className="flex-1 rounded-lg bg-[#e2b714]/15 px-4 py-2 text-sm font-medium text-[#e2b714] transition-colors hover:bg-[#e2b714]/25 disabled:opacity-40"
          >
            {createMutation.isPending ? "Creating..." : "Create Text"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[#646669] transition-colors hover:text-[#d1d0c5]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TextRow({ text }: { text: AdminText }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () => updateAdminText(text.id, { isActive: !text.isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "texts"] });
    }
  });

  return (
    <div className="border-b border-[#3a3d42]/30 px-4 py-3 transition-colors hover:bg-[#2c2e33]/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusDot active={text.isActive} />
            <span className="font-mono text-xs text-[#646669]">{text.key}</span>
            <span className="text-[10px] text-[#4a4d52]">{text.language}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-[#d1d0c5]">{text.content}</p>
          <p className="mt-1 text-[10px] text-[#4a4d52]">
            {text.content.length} chars &middot; updated {formatDate(text.updatedAt)}
          </p>
        </div>
        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
            text.isActive
              ? "bg-[#646669]/10 text-[#646669] hover:bg-[#ca4754]/15 hover:text-[#ca4754]"
              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          {text.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}

export function AdminTextsPanel() {
  const [filter, setFilter] = useState<TextFilter>("all");
  const [showCreate, setShowCreate] = useState(false);

  const textsQuery = useQuery({
    queryKey: ["admin", "texts", filter],
    queryFn: () => listAdminTexts(filter),
    staleTime: 15_000
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-[#2c2e33]/50 px-1.5 py-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === f ? "bg-[#3a3d42] text-[#d1d0c5]" : "text-[#646669] hover:text-[#d1d0c5]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#e2b714]/15 px-3 py-1.5 text-sm font-medium text-[#e2b714] transition-colors hover:bg-[#e2b714]/25"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
          Add Text
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#3a3d42]/60 bg-[#1e2228]/60">
        {textsQuery.isLoading ? (
          <LoadingRows />
        ) : textsQuery.isError ? (
          <div className="px-4 py-8 text-center text-sm text-[#ca4754]/80">Failed to load texts</div>
        ) : (textsQuery.data?.length ?? 0) === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#646669]">No texts found</div>
        ) : (
          textsQuery.data?.map((text) => <TextRow key={text.id} text={text} />)
        )}
      </div>

      {showCreate ? <CreateTextModal onClose={() => setShowCreate(false)} /> : null}
    </div>
  );
}
