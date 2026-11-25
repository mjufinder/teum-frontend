"use client";

import { Check, Copy, ExternalLink, Link2, RefreshCw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmDialog from "@/components/meeting/ConfirmDialog";
import { ApiError } from "@/lib/api";
import { issueShareLink, shareUrl } from "@/lib/confirm";

interface ShareLinkCardProps {
  meetingId: string;
  isAdmin: boolean;
  initialShareToken?: string | null;
  onShareTokenIssued?: (token: string) => void;
  highlighted?: boolean;
}

export default function ShareLinkCard({
  meetingId,
  isAdmin,
  initialShareToken,
  onShareTokenIssued,
  highlighted = false,
}: ShareLinkCardProps) {
  const router = useRouter();
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const activeToken = issuedToken ?? initialShareToken ?? null;
  const shareLink = activeToken ? shareUrl(activeToken) : null;
  const [issuing, setIssuing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [pageCopied, setPageCopied] = useState(false);
  const [confirmReissue, setConfirmReissue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doIssue() {
    setConfirmReissue(false);
    setError(null);
    setShareCopied(false);
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

  async function handleCopyShare() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setError("복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  async function handleCopyPageUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setPageCopied(true);
      setTimeout(() => setPageCopied(false), 2000);
    } catch {
      setError("모임 주소를 복사하지 못했어요.");
    }
  }

  return (
    <>
      <section
        className={`flex flex-col gap-3 rounded-[12px] border bg-ink-1 p-4 transition-all duration-300 ${
          highlighted
            ? "border-neon ring-2 ring-neon/50 shadow-[0_0_24px_rgba(0,255,163,0.18)]"
            : "border-ink-line"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-text">공유 링크</h2>
          <button
            type="button"
            onClick={handleCopyPageUrl}
            className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-ink-line-2 bg-ink-base px-2.5 text-[11px] font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text"
          >
            {pageCopied ? <Check className="size-3 text-neon" /> : <Link2 className="size-3" />}
            {pageCopied ? "복사됨" : "모임 주소 복사"}
          </button>
        </div>

        <p className="text-xs leading-relaxed text-ink-text-3">
          {isAdmin
            ? "일정이 확정되면 외부 공유 링크를 발급해 로그인 없이도 일정을 보여줄 수 있어요."
            : "모임 주소를 복사해 팀원들에게 바로 공유할 수 있어요."}
        </p>

        {isAdmin && (
          <div className="flex flex-col gap-2">
            {shareLink && (
              <div className="flex gap-1.5">
                <label htmlFor="sidebar-share-link" className="sr-only">
                  확정 일정 공유 링크
                </label>
                <input
                  id="sidebar-share-link"
                  readOnly
                  value={shareLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-8 min-w-0 flex-1 rounded-[8px] border border-ink-line-2 bg-ink-base px-2.5 text-xs text-ink-text focus:border-neon focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyShare}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] bg-neon px-2.5 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2"
                >
                  {shareCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {shareCopied ? "복사됨" : "복사"}
                </button>
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="공유 링크로 이동"
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] border border-ink-line-2 bg-ink-base px-2.5 text-xs font-semibold text-ink-text transition-colors hover:bg-ink-2"
                >
                  <ExternalLink className="size-3.5 text-neon" />
                  이동
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={() => (shareLink ? setConfirmReissue(true) : doIssue())}
              disabled={issuing}
              className="inline-flex h-8 w-fit items-center gap-1.5 rounded-[8px] border border-ink-line-2 bg-ink-base px-3 text-xs font-semibold text-ink-text transition-colors hover:bg-ink-2 disabled:opacity-50"
            >
              {shareLink ? (
                <RefreshCw className="size-3 text-ink-text-3" />
              ) : (
                <Share2 className="size-3 text-neon" />
              )}
              {issuing
                ? "발급 중..."
                : shareLink
                  ? "새 공유 링크 만들기"
                  : "확정 일정 링크 만들기"}
            </button>
          </div>
        )}

        {error && <p className="text-xs text-live">{error}</p>}
      </section>

      <ConfirmDialog
        open={confirmReissue}
        title="새 공유 링크를 만들까요?"
        description="새 링크를 만들면 이전 공유 링크는 더 이상 열리지 않아요."
        confirmLabel="새 링크 만들기"
        busy={issuing}
        onConfirm={doIssue}
        onCancel={() => setConfirmReissue(false)}
      />
    </>
  );
}
