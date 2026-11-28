"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import TeumLoader from "@/components/layout/TeumLoader";
import CommentSection from "@/components/notice/CommentSection";
import { ApiError } from "@/lib/api";
import {
  deleteNotice,
  formatExact,
  formatWhen,
  getMeOrNull,
  getNotice,
  isAdmin,
  isEdited,
} from "@/lib/notices";
import type { Notice } from "@/types/notice";
import type { UserOut } from "@/types/user";

function NoticeDetail() {
  const router = useRouter();
  const params = useParams<{ noticeId: string }>();
  const noticeId = Number(params.noticeId);
  const invalidId = Number.isNaN(noticeId);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [me, setMe] = useState<UserOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setNotice(await getNotice(noticeId));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
        return;
      }
      setError(e instanceof ApiError ? e.message : "공지를 불러오지 못했어요.");
    }
  }, [noticeId]);

  useEffect(() => {
    if (invalidId) return;
    Promise.resolve().then(() => load());
    getMeOrNull().then(setMe).catch(() => setMe(null));
  }, [invalidId, load]);

  async function handleDelete() {
    if (!confirm("이 공지를 삭제할까요? 되돌릴 수 없어요.")) return;
    setDeleting(true);
    try {
      await deleteNotice(noticeId);
      router.replace("/notices");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "공지를 삭제하지 못했어요.");
      setDeleting(false);
    }
  }

  const admin = isAdmin(me);

  if (invalidId || notFound) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm font-semibold text-ink-text-2">공지를 찾을 수 없어요</p>
        <p className="mt-1 text-sm text-ink-text-weak">이미 삭제되었거나 없는 공지예요.</p>
        <Link
          href="/notices"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-text-3 transition-colors hover:text-ink-text"
        >
          <ArrowLeft className="size-4" />
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/notices"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-text-3 transition-colors hover:text-ink-text"
      >
        <ArrowLeft className="size-4" />
        공지사항
      </Link>

      {error && (
        <div className="rounded-[8px] border border-live/30 bg-live/5 px-4 py-2.5 text-sm text-live">
          {error}
        </div>
      )}

      {!notice ? (
        <div className="flex flex-col gap-3">
          <div className="h-7 w-2/3 animate-pulse rounded bg-ink-2" />
          <div className="h-4 w-36 animate-pulse rounded bg-ink-2" />
          <div className="mt-4 h-40 animate-pulse rounded bg-ink-1" />
        </div>
      ) : (
        <>
          {/* 제목 + 바이라인 */}
          <header className="flex flex-col gap-3 border-b border-ink-line pb-5">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl leading-[1.3] font-bold tracking-[-0.02em] text-ink-text">
                {notice.title}
              </h1>
              {admin && (
                <div className="flex shrink-0 items-center gap-3 pt-1 text-xs font-semibold">
                  <Link
                    href={`/notices/${notice.notice_id}/edit`}
                    className="text-ink-text-3 transition-colors hover:text-ink-text"
                  >
                    수정
                  </Link>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1 text-ink-text-3 transition-colors hover:text-live disabled:opacity-40"
                  >
                    {deleting && <Loader2 className="size-3 animate-spin" />}
                    삭제
                  </button>
                </div>
              )}
            </div>
            <p
              className="text-sm text-ink-text-3 tabular-nums"
              title={formatExact(notice.created_at)}
            >
              관리자 · {formatWhen(notice.created_at)}
              {isEdited(notice.created_at, notice.updated_at) && " · 수정됨"}
            </p>
          </header>

          {/* 본문 */}
          <div className="text-[0.95rem] leading-[1.8] whitespace-pre-wrap text-ink-text-2">
            {notice.content}
          </div>

          <div className="mt-6 border-t border-ink-line pt-6">
            <CommentSection noticeId={notice.notice_id} me={me} />
          </div>
        </>
      )}
    </div>
  );
}

export default function NoticeDetailPage() {
  return (
    <Suspense fallback={<TeumLoader />}>
      <NoticeDetail />
    </Suspense>
  );
}
