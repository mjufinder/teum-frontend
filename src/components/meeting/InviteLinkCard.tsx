"use client";

import { Check, Copy, QrCode, RefreshCw, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import ConfirmDialog from "@/components/meeting/ConfirmDialog";
import { ApiError } from "@/lib/api";
import { issueInviteCode, type InviteCodeOut } from "@/lib/meetings";

interface InviteLinkCardProps {
  meetingId: string;
  isAdmin: boolean;
  initialInviteCode?: string | null;
}

export default function InviteLinkCard({
  meetingId,
  isAdmin,
  initialInviteCode,
}: InviteLinkCardProps) {
  const router = useRouter();
  const [inviteData, setInviteData] = useState<InviteCodeOut | null>(
    initialInviteCode
      ? {
          invite_code: initialInviteCode,
          invite_url: `${typeof window !== "undefined" ? window.location.origin : ""}/join/${initialInviteCode}`,
        }
      : null
  );
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReissue, setConfirmReissue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const inviteUrl = inviteData
    ? typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteData.invite_code}`
      : inviteData.invite_url
    : null;

  useEffect(() => {
    if (!inviteUrl || !showQr) return;
    QRCode.toDataURL(inviteUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [inviteUrl, showQr]);

  async function doIssue() {
    setConfirmReissue(false);
    setError(null);
    setIssuing(true);
    setQrDataUrl(null);
    try {
      const data = await issueInviteCode(meetingId);
      setInviteData(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "초대 링크를 만들지 못했어요.");
    } finally {
      setIssuing(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("복사하지 못했어요.");
    }
  }

  if (!isAdmin) return null;

  return (
    <>
      <section className="flex flex-col gap-3 rounded-[12px] border border-ink-line bg-ink-1 p-4">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-neon" />
          <h2 className="text-sm font-bold text-ink-text">초대 링크</h2>
        </div>

        <p className="text-xs leading-relaxed text-ink-text-3">
          링크를 공유하면 상대방이 클릭 한 번으로 모임에 바로 참가해요.
        </p>

        {inviteUrl ? (
          <div className="flex flex-col gap-2">
            {/* 링크 복사 행 */}
            <div className="flex gap-1.5">
              <input
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="h-8 min-w-0 flex-1 rounded-[8px] border border-ink-line-2 bg-ink-base px-2.5 text-xs text-ink-text focus:border-neon focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] bg-neon px-2.5 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>

            {/* QR 토글 */}
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-ink-line-2 bg-ink-base px-2.5 text-[11px] font-semibold text-ink-text-2 transition-colors hover:bg-ink-2"
              >
                <QrCode className="size-3.5 text-neon" />
                {showQr ? "QR 닫기" : "QR 코드 보기"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReissue(true)}
                disabled={issuing}
                className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-ink-line-2 bg-ink-base px-2.5 text-[11px] font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 disabled:opacity-50"
              >
                <RefreshCw className="size-3" />
                재발급
              </button>
            </div>

            {showQr && qrDataUrl && (
              <div className="flex justify-center rounded-[10px] border border-ink-line bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="초대 QR 코드" width={160} height={160} />
              </div>
            )}
            {showQr && !qrDataUrl && (
              <div className="flex h-[160px] items-center justify-center rounded-[10px] border border-ink-line bg-ink-base">
                <span className="text-xs text-ink-text-weak">QR 생성 중...</span>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={doIssue}
            disabled={issuing}
            className="inline-flex h-8 w-fit items-center gap-1.5 rounded-[8px] bg-neon px-3 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:opacity-50"
          >
            <UserPlus className="size-3.5" />
            {issuing ? "생성 중..." : "초대 링크 만들기"}
          </button>
        )}

        {error && <p className="text-xs text-live">{error}</p>}
      </section>

      <ConfirmDialog
        open={confirmReissue}
        title="초대 링크를 새로 만들까요?"
        description="새 링크를 만들면 이전 초대 링크는 더 이상 사용할 수 없어요."
        confirmLabel="새 링크 만들기"
        busy={issuing}
        onConfirm={doIssue}
        onCancel={() => setConfirmReissue(false)}
      />
    </>
  );
}
