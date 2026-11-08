"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { issueShareLink, shareUrl } from "@/lib/confirm";

interface ConfirmedScheduleProps {
  meetingId: string;
  // 확정한 시간 문구. 다른 화면에서 이미 확정돼 무엇인지 모르면 null
  slotLabel: string | null;
  isAdmin: boolean;
}

// 확정된 일정 표시와 외부 공유 링크 발급 (VOTE-03, VOTE-04)
export default function ConfirmedSchedule({ meetingId, slotLabel, isAdmin }: ConfirmedScheduleProps) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIssue() {
    if (link && !confirm("새 링크를 만들면 이전 링크는 더 이상 열리지 않아요. 계속할까요?")) {
      return;
    }
    setError(null);
    setCopied(false);
    setIssuing(true);
    try {
      const { share_token } = await issueShareLink(meetingId);
      setLink(shareUrl(share_token));
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
    } catch {
      setError("복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <div className="card flex flex-col gap-3 !border-brand-strong !p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge bg-brand-strong text-surface">확정</span>
        <span className="text-lg font-bold tracking-[-0.01em] tabular-nums">
          {slotLabel ?? "이미 확정된 일정이 있어요"}
        </span>
      </div>
      <p className="text-sm text-muted">
        모임 시간이 정해졌어요. 링크로 팀원이 아닌 사람에게도 일정을 알려 줄 수 있어요.
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
                className="input text-sm"
              />
              <button type="button" onClick={handleCopy} className="btn btn-primary shrink-0">
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleIssue}
            disabled={issuing}
            className="btn btn-secondary btn-sm self-start"
          >
            {issuing ? "만드는 중..." : link ? "새 링크 만들기" : "공유 링크 만들기"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
