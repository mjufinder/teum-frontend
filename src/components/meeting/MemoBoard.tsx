"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

// 모임 구성원끼리 공지·할 일을 남기는 메모 (MEET-06)
export default function MemoBoard({
  meetingId,
  myUserId,
  isAdmin,
  members,
  emails,
}: MemoBoardProps) {
  const router = useRouter();
  const [memos, setMemos] = useState<Memo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
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

  async function handleDelete(memo: Memo) {
    if (!confirm("이 메모를 삭제할까요?")) return;
    setActionError(null);
    setBusyId(memo.memo_id);
    try {
      await deleteMemo(meetingId, memo.memo_id);
      setMemos((prev) => (prev ?? []).filter((m) => m.memo_id !== memo.memo_id));
    } catch (err) {
      handleError(err, "메모를 삭제하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="section-title">
        메모 {memos && <span className="text-muted">{memos.length}</span>}
      </h2>

      <form onSubmit={handlePost} className="card flex flex-col gap-3">
        <label htmlFor="memo-draft" className="sr-only">
          새 메모
        </label>
        <textarea
          id="memo-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MEMO_MAX_LENGTH}
          rows={3}
          placeholder="팀원에게 남길 공지나 할 일을 적어 주세요."
          disabled={posting}
          className="input resize-none"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-muted">
            {draft.length} / {MEMO_MAX_LENGTH}
          </span>
          <button type="submit" disabled={posting || !draft.trim()} className="btn btn-primary">
            {posting ? "남기는 중..." : "메모 남기기"}
          </button>
        </div>
      </form>

      {actionError && <p className="text-sm text-danger">{actionError}</p>}
      {loadError && <p className="text-sm text-danger">{loadError}</p>}
      {!loadError && !memos && <p className="text-sm text-muted">메모를 불러오는 중...</p>}
      {memos && memos.length === 0 && (
        <p className="text-sm text-muted">아직 남긴 메모가 없어요.</p>
      )}

      {memos && memos.length > 0 && (
        <ul className="border-t border-line">
          {memos.map((memo) => {
            const canEdit = memo.author_user_id === myUserId || isAdmin;
            const editing = editingId === memo.memo_id;
            const busy = busyId === memo.memo_id;
            return (
              <li key={memo.memo_id} className="flex flex-col gap-2 border-b border-line py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold">{authorLabel(memo.author_user_id)}</span>
                  <span className="text-xs text-muted">{formatCreatedAt(memo.created_at)}</span>
                  {canEdit && !editing && (
                    <span className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(memo)}
                        disabled={busy}
                        className="btn btn-secondary btn-sm"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(memo)}
                        disabled={busy}
                        className="btn btn-danger btn-sm"
                      >
                        {busy ? "삭제 중..." : "삭제"}
                      </button>
                    </span>
                  )}
                </div>

                {editing ? (
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`memo-edit-${memo.memo_id}`} className="sr-only">
                      메모 수정
                    </label>
                    <textarea
                      id={`memo-edit-${memo.memo_id}`}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      maxLength={MEMO_MAX_LENGTH}
                      rows={3}
                      disabled={busy}
                      className="input resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={busy}
                        className="btn btn-secondary btn-sm"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(memo)}
                        disabled={busy || !editDraft.trim()}
                        className="btn btn-primary btn-sm"
                      >
                        {busy ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-[0.9375rem]">
                    {memo.content}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
