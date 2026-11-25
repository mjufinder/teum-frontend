"use client";

import { Pencil, Pin, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

import ConfirmDialog from "@/components/meeting/ConfirmDialog";
import { memberLabel } from "@/components/meeting/MemberList";
import { ApiError } from "@/lib/api";
import { MEMO_MAX_LENGTH, createMemo, deleteMemo, getMemos, updateMemo } from "@/lib/memos";
import type { Member } from "@/types/meeting";
import type { Memo } from "@/types/memo";

interface MemoBoardProps {
  meetingId: string;
  myUserId: number;
  isAdmin: boolean;
  members: Member[];
  emails: Record<number, string>;
}

function formatCreatedAt(iso: string | null) {
  if (!iso) return "방금";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

function renderMemoText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={idx}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-neon underline underline-offset-2 hover:text-neon-2"
      >
        {part}
      </a>
    ) : (
      <Fragment key={idx}>{part}</Fragment>
    )
  );
}

// 모임 구성원끼리 공지·할 일을 남기는 메모 (MEET-06)
export default function MemoBoard({
  meetingId,
  myUserId,
  isAdmin,
  members,
  emails,
}: MemoBoardProps) {
  const router = useRouter();
  const pinStorageKey = `teum:pinned_memos:${meetingId}`;
  const [memos, setMemos] = useState<Memo[] | null>(null);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Memo | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "pinned">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(pinStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setPinnedIds(parsed.filter((x) => typeof x === "number"));
        }
      } catch {
        /* 무시 */
      }
    });
  }, [pinStorageKey]);

  useEffect(() => {
    getMemos(meetingId)
      .then(setMemos)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(e instanceof ApiError ? e.message : "메모를 불러오지 못했어요.");
      });
  }, [meetingId, router]);

  function handleError(e: unknown, fallback: string) {
    if (e instanceof ApiError && e.status === 401) {
      router.replace("/login");
      return;
    }
    setActionError(e instanceof ApiError ? e.message : fallback);
  }

  function authorLabel(userId: number) {
    const member = members.find((m) => m.user_id === userId);
    if (member) return memberLabel(member, myUserId, emails);
    return userId === myUserId ? "나" : "이전 구성원";
  }

  function togglePin(memoId: number) {
    setPinnedIds((prev) => {
      const next = prev.includes(memoId)
        ? prev.filter((id) => id !== memoId)
        : [memoId, ...prev];
      try {
        localStorage.setItem(pinStorageKey, JSON.stringify(next));
      } catch {
        /* 무시 */
      }
      return next;
    });
  }

  const orderedMemos = useMemo(() => {
    if (!memos) return null;
    const pinSet = new Set(pinnedIds);
    const q = searchQuery.trim().toLowerCase();
    const filtered = memos.filter((m) => {
      if (filter === "mine" && m.author_user_id !== myUserId) return false;
      if (filter === "pinned" && !pinSet.has(m.memo_id)) return false;
      if (q && !m.content.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const ap = pinSet.has(a.memo_id) ? 0 : 1;
      const bp = pinSet.has(b.memo_id) ? 0 : 1;
      return ap - bp;
    });
  }, [memos, pinnedIds, filter, searchQuery, myUserId]);

  async function submitDraft() {
    const content = draft.trim();
    if (!content || posting) return;
    setActionError(null);
    setPosting(true);
    try {
      const memo = await createMemo(meetingId, content);
      setMemos((prev) => [memo, ...(prev ?? [])]);
      setDraft("");
    } catch (err) {
      handleError(err, "메모를 남기지 못했어요.");
    } finally {
      setPosting(false);
    }
  }

  function handlePost(e: React.FormEvent) {
    e.preventDefault();
    submitDraft();
  }

  function startEdit(memo: Memo) {
    setActionError(null);
    setEditingId(memo.memo_id);
    setEditDraft(memo.content);
  }

  async function handleUpdate(memo: Memo) {
    const content = editDraft.trim();
    if (!content) return;
    setActionError(null);
    setBusyId(memo.memo_id);
    try {
      const updated = await updateMemo(meetingId, memo.memo_id, content);
      setMemos((prev) =>
        (prev ?? []).map((m) => (m.memo_id === memo.memo_id ? { ...m, ...updated } : m))
      );
      setEditingId(null);
    } catch (err) {
      handleError(err, "메모를 수정하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setActionError(null);
    setBusyId(target.memo_id);
    try {
      await deleteMemo(meetingId, target.memo_id);
      setMemos((prev) => (prev ?? []).filter((m) => m.memo_id !== target.memo_id));
      setDeleteTarget(null);
    } catch (err) {
      handleError(err, "메모를 삭제하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-ink-text">
            메모{" "}
            {memos && (
              <span className="ml-1 text-xs font-medium text-ink-text-weak tabular-nums">
                {memos.length}
              </span>
            )}
          </h2>
          <span className="hidden text-[11px] text-ink-text-weak sm:inline">
            Cmd/Ctrl + Enter로 바로 등록
          </span>
        </div>

        <form
          onSubmit={handlePost}
          className="flex flex-col gap-2.5 rounded-[12px] border border-ink-line bg-ink-1 p-4 transition-colors focus-within:border-ink-line-2"
        >
          <label htmlFor="memo-draft" className="sr-only">
            새 메모
          </label>
          <textarea
            id="memo-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submitDraft();
              }
            }}
            maxLength={MEMO_MAX_LENGTH}
            rows={2}
            placeholder="팀원에게 남길 공지나 할 일을 적어 주세요."
            disabled={posting}
            className="w-full resize-none bg-transparent text-sm text-ink-text placeholder:text-ink-text-weak focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 border-t border-ink-line pt-2.5">
            <span className="text-xs text-ink-text-weak tabular-nums">
              {draft.length} / {MEMO_MAX_LENGTH}
            </span>
            <button
              type="submit"
              disabled={posting || !draft.trim()}
              className="inline-flex h-8 items-center rounded-[8px] bg-neon px-3.5 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {posting ? "남기는 중..." : "남기기"}
            </button>
          </div>
        </form>

        {actionError && <p className="text-xs text-live">{actionError}</p>}
        {loadError && <p className="text-xs text-live">{loadError}</p>}
        {!loadError && !orderedMemos && (
          <p className="text-xs text-ink-text-3">메모를 불러오는 중...</p>
        )}
        {memos && memos.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center rounded-[8px] border border-ink-line bg-ink-1 p-0.5 text-[11px] font-semibold">
              {(
                [
                  { id: "all", label: "전체" },
                  { id: "mine", label: "내 메모" },
                  { id: "pinned", label: "고정됨" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={`rounded-[6px] px-2.5 py-1 transition-colors ${
                    filter === t.id
                      ? "bg-ink-3 text-ink-text"
                      : "text-ink-text-3 hover:text-ink-text"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-48">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3 -translate-y-1/2 text-ink-text-weak" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="메모 검색..."
                className="h-8 w-full rounded-[8px] border border-ink-line bg-ink-1 pr-2.5 pl-7 text-xs text-ink-text placeholder:text-ink-text-weak focus:border-ink-line-2 focus:outline-none"
              />
            </div>
          </div>
        )}

        {orderedMemos && orderedMemos.length === 0 && (
          <p className="py-4 text-center text-xs text-ink-text-weak">
            {memos && memos.length > 0 ? "조건에 맞는 메모가 없어요." : "아직 남긴 메모가 없어요."}
          </p>
        )}

        {orderedMemos && orderedMemos.length > 0 && (
          <ul className="divide-y divide-ink-line overflow-hidden rounded-[12px] border border-ink-line bg-ink-1">
            {orderedMemos.map((memo) => {
              const isMine = memo.author_user_id === myUserId;
              const isPinned = pinnedIds.includes(memo.memo_id);
              const canEdit = isMine || isAdmin;
              const editing = editingId === memo.memo_id;
              const busy = busyId === memo.memo_id;
              return (
                <li
                  key={memo.memo_id}
                  className={`group flex flex-col gap-1.5 px-4 py-3.5 ${
                    isPinned ? "bg-neon/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden
                      className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        isMine ? "bg-neon text-on-neon" : "bg-ink-3 text-ink-text-2"
                      }`}
                    >
                      {isMine ? "나" : memo.author_user_id}
                    </span>
                    <span className="font-semibold text-ink-text">
                      {authorLabel(memo.author_user_id)}
                    </span>
                    <span className="text-ink-text-weak">{formatCreatedAt(memo.created_at)}</span>
                    {isPinned && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-neon/10 px-1.5 py-0.5 text-[10px] font-bold text-neon">
                        <Pin className="size-2.5" />
                        고정
                      </span>
                    )}
                    {!editing && (
                      <span className="ml-auto flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => togglePin(memo.memo_id)}
                          aria-label={isPinned ? "고정 해제" : "메모 고정"}
                          className={`grid size-6 place-items-center rounded transition-colors ${
                            isPinned
                              ? "text-neon hover:bg-ink-2"
                              : "text-ink-text-weak hover:bg-ink-2 hover:text-ink-text"
                          }`}
                        >
                          <Pin className="size-3.5" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(memo)}
                              disabled={busy}
                              aria-label="메모 수정"
                              className="grid size-6 place-items-center rounded text-ink-text-weak transition-colors hover:bg-ink-2 hover:text-ink-text"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(memo)}
                              disabled={busy}
                              aria-label="메모 삭제"
                              className="grid size-6 place-items-center rounded text-ink-text-weak transition-colors hover:bg-live/10 hover:text-live"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {editing ? (
                    <div className="flex flex-col gap-2 pt-1 pl-7">
                      <label htmlFor={`memo-edit-${memo.memo_id}`} className="sr-only">
                        메모 수정
                      </label>
                      <textarea
                        id={`memo-edit-${memo.memo_id}`}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                            e.preventDefault();
                            handleUpdate(memo);
                          }
                        }}
                        maxLength={MEMO_MAX_LENGTH}
                        rows={3}
                        disabled={busy}
                        className="w-full resize-none rounded-[8px] border border-ink-line-2 bg-ink-base p-2.5 text-sm text-ink-text focus:border-neon focus:outline-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                          className="h-7 rounded-[6px] border border-ink-line-2 px-2.5 text-xs font-semibold text-ink-text-2 hover:bg-ink-2"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdate(memo)}
                          disabled={busy || !editDraft.trim()}
                          className="h-7 rounded-[6px] bg-neon px-3 text-xs font-bold text-on-neon hover:bg-neon-2 disabled:opacity-50"
                        >
                          {busy ? "저장 중..." : "저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="pl-7 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-text-2">
                      {renderMemoText(memo.content)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="이 메모를 삭제할까요?"
        description="삭제한 메모는 복구할 수 없어요."
        confirmLabel="삭제"
        tone="danger"
        busy={deleteTarget !== null && busyId === deleteTarget.memo_id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
