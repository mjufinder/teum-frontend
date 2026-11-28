"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  PAGE_SIZE,
  formatExact,
  formatShort,
  getMeOrNull,
  getNotices,
  isAdmin,
  isEdited,
  isNew,
} from "@/lib/notices";
import type { NoticeListItem } from "@/types/notice";
import type { UserOut } from "@/types/user";

export default function NoticesPage() {
  const [items, setItems] = useState<NoticeListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [me, setMe] = useState<UserOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setError(null);
    try {
      const res = await getNotices(nextPage);
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "공지를 불러오지 못했어요.");
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(1));
    getMeOrNull().then(setMe).catch(() => setMe(null));
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const admin = isAdmin(me);

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-end justify-between gap-4 border-b border-ink-line pb-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink-text">공지사항</h1>
          {items && (
            <span className="text-sm font-semibold text-ink-text-weak tabular-nums">
              {total}
            </span>
          )}
        </div>

        {admin && (
          <Link
            href="/notices/new"
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[7px] border border-ink-line bg-ink-1 px-3 text-sm font-semibold text-ink-text-2 transition-colors hover:border-ink-line-2 hover:text-ink-text"
          >
            <Plus className="size-4" />
            새 공지
          </Link>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-[8px] border border-live/30 bg-live/5 px-4 py-2.5 text-sm text-live">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => load(page)}
            className="text-xs font-semibold underline underline-offset-2"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 로딩 */}
      {!error && !items && (
        <div className="divide-y divide-ink-line overflow-hidden rounded-[8px] border border-ink-line">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="h-4 w-48 animate-pulse rounded bg-ink-2" />
              <div className="h-3.5 w-20 animate-pulse rounded bg-ink-2" />
            </div>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {items && items.length === 0 && (
        <div className="rounded-[8px] border border-dashed border-ink-line px-6 py-14 text-center">
          <p className="text-sm font-semibold text-ink-text-2">등록된 공지가 없어요</p>
          <p className="mt-1 text-sm text-ink-text-weak">
            새로운 소식이 생기면 이곳에 안내해드릴게요.
          </p>
        </div>
      )}

      {/* 목록 */}
      {items && items.length > 0 && (
        <ul className="divide-y divide-ink-line overflow-hidden rounded-[8px] border border-ink-line">
          {items.map((n) => (
            <li key={n.notice_id}>
              <Link
                href={`/notices/${n.notice_id}`}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-1"
              >
                {/* 신규 표시 점 (최근 3일) */}
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${
                    isNew(n.created_at) ? "bg-neon" : "bg-transparent"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-text group-hover:text-ink-text">
                  {n.title}
                </span>
                <span
                  className="shrink-0 text-xs text-ink-text-weak tabular-nums"
                  title={formatExact(n.created_at)}
                >
                  관리자
                  {isEdited(n.created_at, n.updated_at) && " · 수정됨"} · {formatShort(n.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 페이지네이션 */}
      {items && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="font-semibold text-ink-text-3 transition-colors hover:text-ink-text disabled:opacity-40 disabled:hover:text-ink-text-3"
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
            className="font-semibold text-ink-text-3 transition-colors hover:text-ink-text disabled:opacity-40 disabled:hover:text-ink-text-3"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
