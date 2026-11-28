"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  COMMENT_MAX,
  PAGE_SIZE,
  authorLabel,
  createComment,
  deleteComment,
  formatExact,
  formatWhen,
  getComments,
  isEdited,
  updateComment,
} from "@/lib/notices";
import type { NoticeComment } from "@/types/notice";
import type { UserOut } from "@/types/user";

export default function CommentSection({
  noticeId,
  me,
}: {
  noticeId: number;
  me: UserOut | null;
}) {
  const [comments, setComments] = useState<NoticeComment[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // 새 댓글 입력
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 인라인 수정
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);

  const load = useCallback(
    async (nextPage: number) => {
      setError(null);
      try {
        const res = await getComments(noticeId, nextPage);
        setComments(res.items);
        setTotal(res.total);
        setPage(res.page);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "댓글을 불러오지 못했어요.");
      }
    },
    [noticeId]
  );

  useEffect(() => {
    Promise.resolve().then(() => load(1));
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createComment(noticeId, content);
      setDraft("");
      await load(Math.max(1, Math.ceil((total + 1) / PAGE_SIZE)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "댓글을 등록하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(c: NoticeComment) {
    setEditingId(c.comment_id);
    setEditDraft(c.content);
  }

  async function handleUpdate(commentId: number) {
    const content = editDraft.trim();
    if (!content) return;
    setRowBusyId(commentId);
    setError(null);
    try {
      const updated = await updateComment(noticeId, commentId, content);
      setComments((prev) =>
        prev ? prev.map((c) => (c.comment_id === commentId ? updated : c)) : prev
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "댓글을 수정하지 못했어요.");
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleDelete(commentId: number) {
    if (!confirm("이 댓글을 삭제할까요?")) return;
    setRowBusyId(commentId);
    setError(null);
    try {
      await deleteComment(noticeId, commentId);
      const nextTotal = total - 1;
      const lastPage = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      await load(Math.min(page, lastPage));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "댓글을 삭제하지 못했어요.");
    } finally {
      setRowBusyId(null);
    }
  }

  const draftLen = draft.trim().length;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-bold text-ink-text">
        댓글 <span className="text-ink-text-weak tabular-nums">{total}</span>
      </h2>

      {/* 작성 영역 */}
      {me ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder="댓글을 남겨주세요."
            className="w-full resize-y rounded-[8px] border border-ink-line bg-ink-1 px-3.5 py-2.5 text-sm text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-ink-line-2 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-text-weak tabular-nums">
              {draftLen} / {COMMENT_MAX}
            </span>
            <button
              type="submit"
              disabled={draftLen === 0 || submitting}
              className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-ink-line bg-ink-1 px-3.5 text-sm font-semibold text-ink-text-2 transition-colors hover:border-ink-line-2 hover:text-ink-text disabled:opacity-40"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              등록
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-text-3">
          댓글을 작성하려면{" "}
          <Link href="/login" className="font-semibold text-ink-text underline underline-offset-2">
            로그인
          </Link>
          이 필요해요.
        </p>
      )}

      {error && (
        <div className="rounded-[8px] border border-live/30 bg-live/5 px-4 py-2.5 text-sm text-live">
          {error}
        </div>
      )}

      {/* 목록 */}
      {!comments ? (
        <div className="flex flex-col gap-4 pt-1">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-3.5 w-24 animate-pulse rounded bg-ink-2" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-ink-2" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-text-weak">
          아직 댓글이 없어요. 첫 댓글을 남겨보세요.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink-line border-t border-ink-line">
          {comments.map((c) => {
            const mine = Boolean(me && me.user_id === c.author_user_id);
            const editing = editingId === c.comment_id;
            const busy = rowBusyId === c.comment_id;
            return (
              <li key={c.comment_id} className="py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-ink-text-2">
                      {authorLabel(c.author_user_id, me)}
                    </span>
                    <span
                      className="text-ink-text-weak tabular-nums"
                      title={formatExact(c.created_at)}
                    >
                      {formatWhen(c.created_at)}
                      {isEdited(c.created_at, c.updated_at) && " · 수정됨"}
                    </span>
                  </div>
                  {mine && !editing && (
                    <div className="flex items-center gap-2.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="text-ink-text-3 transition-colors hover:text-ink-text"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(c.comment_id)}
                        className="inline-flex items-center gap-1 text-ink-text-3 transition-colors hover:text-live disabled:opacity-40"
                      >
                        {busy && <Loader2 className="size-3 animate-spin" />}
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      maxLength={COMMENT_MAX}
                      rows={3}
                      className="w-full resize-y rounded-[8px] border border-ink-line-2 bg-ink-1 px-3 py-2 text-sm text-ink-text focus:border-ink-line-2 focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-ink-text-3 transition-colors hover:text-ink-text"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        disabled={editDraft.trim().length === 0 || busy}
                        onClick={() => handleUpdate(c.comment_id)}
                        className="inline-flex items-center gap-1 text-ink-text transition-colors hover:text-ink-text disabled:opacity-40"
                      >
                        {busy && <Loader2 className="size-3 animate-spin" />}
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-ink-text-2">
                    {c.content}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 페이지네이션 */}
      {comments && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="font-semibold text-ink-text-3 transition-colors hover:text-ink-text disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-xs text-ink-text-weak tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            className="font-semibold text-ink-text-3 transition-colors hover:text-ink-text disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </section>
  );
}
