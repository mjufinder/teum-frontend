"use client";

import { Check, CheckCircle2, Copy, ExternalLink, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { issueShareLink, shareUrl } from "@/lib/confirm";

interface ConfirmedMeetingModalProps {
  open: boolean;
  meetingId: string;
  meetingName: string;
  slotLabel: string;
  shareToken: string | null;
  isAdmin: boolean;
  onShareTokenIssued: (token: string) => void;
  onClose: () => void;
}

export default function ConfirmedMeetingModal({
  open,
  meetingId,
  meetingName,
  slotLabel,
  shareToken,
  isAdmin,
  onShareTokenIssued,
  onClose,
}: ConfirmedMeetingModalProps) {
  const router = useRouter();
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const link = shareToken ? shareUrl(shareToken) : null;

  async function handleIssue() {
    setError(null);
    setIssuing(true);
    try {
      const { share_token } = await issueShareLink(meetingId);
      onShareTokenIssued(share_token);
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

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("복사하지 못했어요.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmed-meeting-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[18px] border border-ink-line-2 bg-ink-base shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neon/15 px-2.5 py-0.5 text-xs font-bold text-neon">
                <CheckCircle2 className="size-3.5" />
                확정 완료된 모임
              </span>
              <h2
                id="confirmed-meeting-modal-title"
                className="text-lg font-bold text-ink-text"
              >
                {meetingName}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="모달 닫기"
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-text-3 transition-colors hover:bg-ink-2 hover:text-ink-text"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="rounded-[12px] border border-neon/35 bg-neon/10 px-4 py-3">
            <p className="text-[11px] font-semibold text-neon">확정된 일정</p>
            <p className="mt-0.5 text-base font-bold text-ink-text tabular-nums">
              {slotLabel}
            </p>
          </div>

          {/* 공유 링크 생성 / 이동 강조 영역 */}
          <div className="flex flex-col gap-2.5 rounded-[12px] border border-ink-line bg-ink-1 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-text">외부 공유 링크</span>
              {link && (
                <span className="rounded bg-neon/15 px-1.5 py-0.5 text-[10px] font-bold text-neon">
                  생성됨
                </span>
              )}
            </div>

            {link ? (
              <div className="flex flex-col gap-2.5">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="발급된 공유 링크"
                  className="h-9 w-full rounded-[8px] border border-ink-line-2 bg-ink-base px-3 text-xs text-ink-text focus:border-neon focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-neon px-3 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2"
                  >
                    <ExternalLink className="size-3.5" />
                    공유 링크로 이동
                  </a>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-ink-line-2 bg-ink-base px-3 text-xs font-semibold text-ink-text transition-colors hover:bg-ink-2"
                  >
                    {copied ? <Check className="size-3.5 text-neon" /> : <Copy className="size-3.5" />}
                    {copied ? "복사됨" : "링크 복사"}
                  </button>
                </div>
              </div>
            ) : isAdmin ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-xs text-ink-text-3">
                  공유 링크를 생성하면 로그인하지 않은 팀원이나 외부인에게도 확정 일정을 바로 공유할 수 있어요.
                </p>
                <button
                  type="button"
                  onClick={handleIssue}
                  disabled={issuing}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] bg-neon px-4 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:opacity-50"
                >
                  <Share2 className="size-3.5" />
                  {issuing ? "공유 링크 생성 중..." : "공유 링크 생성하기"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-ink-text-3">
                아직 외부 공유 링크가 생성되지 않았어요. 모임 관리자가 공유 링크를 발급할 수 있어요.
              </p>
            )}

            {error && <p className="text-xs text-live">{error}</p>}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-[8px] border border-ink-line-2 px-4 text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
