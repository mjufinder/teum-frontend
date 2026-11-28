"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import {
  NOTICE_CONTENT_MAX,
  NOTICE_TITLE_MAX,
  createNotice,
  updateNotice,
} from "@/lib/notices";
import type { Notice } from "@/types/notice";

/** 공지 작성·수정 겸용 폼. initial 이 있으면 수정 모드. */
export default function NoticeForm({ initial }: { initial?: Notice }) {
  const router = useRouter();
  const editing = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleLen = title.trim().length;
  const contentLen = content.trim().length;
  const valid =
    titleLen > 0 &&
    titleLen <= NOTICE_TITLE_MAX &&
    contentLen > 0 &&
    contentLen <= NOTICE_CONTENT_MAX;

  const backHref = editing ? `/notices/${initial!.notice_id}` : "/notices";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = { title: title.trim(), content: content.trim() };
      const saved = editing
        ? await updateNotice(initial!.notice_id, body)
        : await createNotice(body);
      router.replace(`/notices/${saved.notice_id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError("관리자만 공지를 작성할 수 있어요.");
      } else {
        setError(err instanceof ApiError ? err.message : "저장하지 못했어요.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-text-3 transition-colors hover:text-ink-text"
      >
        <ArrowLeft className="size-4" />
        {editing ? "공지로 돌아가기" : "공지사항"}
      </Link>

      <h1 className="border-b border-ink-line pb-4 text-xl font-bold tracking-[-0.02em] text-ink-text">
        {editing ? "공지 수정" : "새 공지 작성"}
      </h1>

      {error && (
        <div className="rounded-[8px] border border-live/30 bg-live/5 px-4 py-2.5 text-sm text-live">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notice-title" className="text-sm font-semibold text-ink-text-2">
            제목
          </label>
          <input
            id="notice-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={NOTICE_TITLE_MAX}
            placeholder="공지 제목"
            className="h-11 rounded-[8px] border border-ink-line bg-ink-1 px-3.5 text-sm text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-ink-line-2 focus:outline-none"
          />
          <span className="self-end text-[11px] text-ink-text-weak tabular-nums">
            {titleLen} / {NOTICE_TITLE_MAX}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notice-content" className="text-sm font-semibold text-ink-text-2">
            본문
          </label>
          <textarea
            id="notice-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={NOTICE_CONTENT_MAX}
            rows={14}
            placeholder="공지 내용을 입력하세요."
            className="resize-y rounded-[8px] border border-ink-line bg-ink-1 px-3.5 py-3 text-sm leading-relaxed text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-ink-line-2 focus:outline-none"
          />
          <span className="self-end text-[11px] text-ink-text-weak tabular-nums">
            {contentLen} / {NOTICE_CONTENT_MAX}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ink-line pt-4">
          <Link
            href={backHref}
            className="inline-flex h-9 items-center rounded-[7px] px-4 text-sm font-semibold text-ink-text-3 transition-colors hover:text-ink-text"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={!valid || submitting}
            className="inline-flex h-9 items-center gap-1.5 rounded-[7px] border border-ink-line bg-ink-1 px-4 text-sm font-semibold text-ink-text-2 transition-colors hover:border-ink-line-2 hover:text-ink-text disabled:opacity-40"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {editing ? "수정 완료" : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
