"use client";

import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  formatInviteExpiry,
  getInvite,
  inviteUrl,
  issueInvite,
  revokeInvite,
} from "@/lib/invites";
import type { Invite } from "@/types/invite";

interface InvitePanelProps {
  meetingId: string;
  meetingName: string;
}

// 초대 링크·QR 로 스스로 참가하게 한다 (MEET-08). 이메일로 바로 추가하는 방식(MEET-03)과 함께 쓴다.
export default function InvitePanel({ meetingId, meetingName }: InvitePanelProps) {
  const router = useRouter();
  const qrRef = useRef<HTMLCanvasElement>(null);
  // undefined: 불러오는 중, null: 유효한 링크 없음
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInvite(meetingId)
      .then((value) => {
        if (!cancelled) setInvite(value);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setInvite(null);
        setError(e instanceof ApiError ? e.message : "초대 링크를 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, [meetingId, router]);

  async function run(action: () => Promise<void>, fallback: string) {
    setError(null);
    setCopied(false);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function handleIssue() {
    if (invite && !confirm("새 링크를 만들면 이전 링크와 QR 은 더 이상 쓸 수 없어요. 계속할까요?")) {
      return;
    }
    run(async () => setInvite(await issueInvite(meetingId)), "초대 링크를 만들지 못했어요.");
  }

  function handleRevoke() {
    if (!confirm("초대 링크를 끊을까요? 이미 보낸 링크와 QR 로는 참가할 수 없게 돼요.")) return;
    run(async () => {
      await revokeInvite(meetingId);
      setInvite(null);
      setShowQr(false);
    }, "초대 링크를 끊지 못했어요.");
  }

  async function handleCopy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  function handleDownloadQr() {
    const canvas = qrRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${meetingName}-초대QR.png`;
    a.click();
  }

  if (invite === undefined) {
    return (
      <section className="card flex flex-col gap-3">
        <h2 className="text-sm font-bold">초대 링크</h2>
        <p className="text-sm text-muted">불러오는 중...</p>
      </section>
    );
  }

  const link = invite ? inviteUrl(invite.invite_code) : null;

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="text-sm font-bold">초대 링크</h2>

      {invite && link ? (
        <>
          <div className="flex gap-2">
            <label htmlFor="invite-link" className="sr-only">
              초대 링크
            </label>
            <input
              id="invite-link"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="input text-sm"
            />
            <button
              type="button"
              onClick={() => handleCopy(link)}
              className="btn btn-secondary shrink-0"
            >
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
          <p className="text-sm text-muted">
            링크나 QR 로 들어온 사람은 로그인 후 바로 이 모임에 참가해요.{" "}
            {formatInviteExpiry(invite.expires_at)}까지 쓸 수 있어요.
          </p>

          {showQr && (
            <div className="flex flex-col items-start gap-2">
              <QRCodeCanvas
                ref={qrRef}
                value={link}
                size={192}
                marginSize={2}
                fgColor="#036635"
                title={`${meetingName} 초대 QR 코드`}
                className="rounded-[8px] border border-line"
              />
              <button type="button" onClick={handleDownloadQr} className="btn btn-secondary btn-sm">
                QR 이미지 저장
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowQr((v) => !v)}
              aria-pressed={showQr}
              className="chip"
            >
              {showQr ? "QR 숨기기" : "QR 코드 보기"}
            </button>
            <button
              type="button"
              onClick={handleIssue}
              disabled={busy}
              className="btn btn-secondary btn-sm"
            >
              {busy ? "처리 중..." : "새 링크로 바꾸기"}
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={busy}
              className="btn btn-danger btn-sm"
            >
              링크 끊기
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            링크나 QR 을 보내면 이메일을 몰라도 팀원이 직접 참가할 수 있어요. 링크는 7일 동안 쓸 수
            있어요.
          </p>
          <button
            type="button"
            onClick={handleIssue}
            disabled={busy}
            className="btn btn-primary self-start"
          >
            {busy ? "만드는 중..." : "초대 링크 만들기"}
          </button>
        </>
      )}

      {error && <p className="notice notice-danger">{error}</p>}
    </section>
  );
}
