"use client";

import { CalendarPlus, Check, Copy, ExternalLink, Megaphone, RefreshCw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmDialog from "@/components/meeting/ConfirmDialog";
import { ApiError } from "@/lib/api";
import { issueShareLink, shareUrl } from "@/lib/confirm";
import { downloadMeetingIcs } from "@/lib/ics";
import type { ConfirmedSlot } from "@/types/meeting";

interface ConfirmedScheduleProps {
  meetingId: string;
  meetingName?: string;
  description?: string | null;
  confirmedSlot?: ConfirmedSlot | null;
  // 확정한 시간 문구. 다른 화면에서 이미 확정돼 무엇인지 모르면 null
  slotLabel: string | null;
  initialShareToken?: string | null;
  onShareTokenIssued?: (token: string) => void;
  isAdmin: boolean;
}

// 확정된 일정 표시와 외부 공유 링크 발급 (VOTE-03, VOTE-04)
export default function ConfirmedSchedule({
  meetingId,
  meetingName,
  description,
  confirmedSlot,
  slotLabel,
  initialShareToken,
  onShareTokenIssued,
  isAdmin,
}: ConfirmedScheduleProps) {
  const router = useRouter();
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const activeToken = issuedToken ?? initialShareToken ?? null;
  const link = activeToken ? shareUrl(activeToken) : null;
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noticeCopied, setNoticeCopied] = useState(false);
  const [confirmReissue, setConfirmReissue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doIssue() {
    setConfirmReissue(false);
    setError(null);
    setCopied(false);
    setIssuing(true);
    try {
      const { share_token } = await issueShareLink(meetingId);
      setIssuedToken(share_token);
      onShareTokenIssued?.(share_token);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "공유 링크를 만들지 못했어요.");
    } finally {
      setIssuing(false);
    }
  }

  function handleIssueClick() {
    if (link) {
      setConfirmReissue(true);
      return;
    }
    doIssue();
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  async function handleCopyNotice() {
    const title = meetingName ? `[${meetingName}] ` : "";
    const text = `${title}모임 일정이 확정되었어요!\n일시: ${slotLabel ?? "확정 일정 확인"}${
      link ? `\n공유 링크: ${link}` : ""
    }`;
    try {
      await navigator.clipboard.writeText(text);
      setNoticeCopied(true);
      setTimeout(() => setNoticeCopied(false), 2000);
    } catch {
      setError("공지 문구를 복사하지 못했어요.");
    }
  }

  function handleDownloadIcs() {
    if (!confirmedSlot) return;
    downloadMeetingIcs({
      meetingName: meetingName || "모임 일정",
      description,
      dayOfWeek: confirmedSlot.day_of_week,
      startTime: confirmedSlot.start_time,
      endTime: confirmedSlot.end_time,
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-[12px] border border-neon/40 bg-neon/8 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-neon px-2 py-0.5 text-[0.7rem] font-bold text-on-neon">
              확정
            </span>
            <span className="text-base font-bold text-ink-text tabular-nums">
              {slotLabel ?? "이미 확정된 일정이 있어요"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {confirmedSlot && (
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-ink-line-2 bg-ink-base px-2.5 text-[11px] font-semibold text-ink-text transition-colors hover:bg-ink-2"
              >
                <CalendarPlus className="size-3 text-neon" />
                캘린더(.ics)
              </button>
            )}
            {slotLabel && (
              <button
                type="button"
                onClick={handleCopyNotice}
                className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-ink-line-2 bg-ink-base px-2.5 text-[11px] font-semibold text-ink-text transition-colors hover:bg-ink-2"
              >
                {noticeCopied ? (
                  <Check className="size-3 text-neon" />
                ) : (
                  <Megaphone className="size-3 text-neon" />
                )}
                {noticeCopied ? "공지 복사됨" : "공지문 복사"}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-ink-text-2">
          모임 시간이 정해졌어요. 링크로 외부에 공유하거나 캘린더에 바로 등록할 수 있어요.
        </p>

        {isAdmin && (
          <div className="flex flex-col gap-2">
            {link && (
              <div className="flex gap-2">
                <label htmlFor="share-link" className="sr-only">
                  공유 링크
                </label>
                <input
                  id="share-link"
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 w-full rounded-[8px] border border-ink-line-2 bg-ink-base px-3 text-xs text-ink-text focus:border-neon focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-[8px] bg-neon px-3 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "복사됨" : "복사"}
                </button>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-[8px] border border-ink-line-2 bg-ink-base px-3 text-xs font-semibold text-ink-text transition-colors hover:bg-ink-2"
                >
                  <ExternalLink className="size-3.5 text-neon" />
                  이동
                </a>
              </div>
            )}
            <button
              type="button"
              onClick={handleIssueClick}
              disabled={issuing}
              className="inline-flex h-8 w-fit items-center gap-1.5 rounded-[8px] border border-ink-line-2 bg-ink-base px-3 text-xs font-semibold text-ink-text transition-colors hover:bg-ink-2 disabled:opacity-50"
            >
              {link ? <RefreshCw className="size-3" /> : <Share2 className="size-3 text-neon" />}
              {issuing ? "만드는 중..." : link ? "새 링크 만들기" : "공유 링크 만들기"}
            </button>
          </div>
        )}

        {error && <p className="text-xs text-live">{error}</p>}
      </div>

      <ConfirmDialog
        open={confirmReissue}
        title="새 공유 링크를 만들까요?"
        description="새 링크를 만들면 이전 링크는 더 이상 열리지 않아요."
        confirmLabel="새 링크 만들기"
        busy={issuing}
        onConfirm={doIssue}
        onCancel={() => setConfirmReissue(false)}
      />
    </>
  );
}
