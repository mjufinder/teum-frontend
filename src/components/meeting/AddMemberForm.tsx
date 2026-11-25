"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { isMemberAddedButNotMatched } from "@/lib/candidates";
import { addMember } from "@/lib/meetings";
import type { Member } from "@/types/meeting";

interface AddMemberFormProps {
  meetingId: string;
  // 팀원 등록과 추천 계산이 모두 끝났을 때
  onAdded: (member: Member, email: string) => Promise<void>;
  // 팀원은 등록됐지만 추천 계산만 실패했을 때 (목록만 갱신)
  onPartiallyAdded: (email: string) => Promise<void>;
}

export default function AddMemberForm({
  meetingId,
  onAdded,
  onPartiallyAdded,
}: AddMemberFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 계산만 실패한 이메일. 같은 요청을 다시 보내면 서버가 중복 없이 계산만 재시도한다.
  const [retryEmail, setRetryEmail] = useState<string | null>(null);

  async function submit(target: string) {
    setError(null);
    setSubmitting(true);
    try {
      const member = await addMember(meetingId, target);
      await onAdded(member, target);
      setEmail("");
      setRetryEmail(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      if (isMemberAddedButNotMatched(e)) {
        setRetryEmail(target);
        await onPartiallyAdded(target);
      } else {
        setRetryEmail(null);
      }
      setError(e instanceof ApiError ? e.message : "팀원을 추가하지 못했어요.");
    }
    setSubmitting(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed) submit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-ink-line pt-3.5">
      <label htmlFor="member-email" className="text-xs font-semibold text-ink-text-2">
        팀원 추가
      </label>
      <div className="flex gap-1.5">
        <input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          disabled={submitting}
          className="h-9 min-w-0 flex-1 rounded-[8px] border border-ink-line-2 bg-ink-base px-3 text-xs text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-neon focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] bg-neon px-3.5 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "추가 중" : "추가"}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-text-weak">
        상대가 먼저 틈에 로그인해야 추가할 수 있어요.
      </p>
      {error && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-live">
          <span>{error}</span>
          {retryEmail && (
            <button
              type="button"
              onClick={() => submit(retryEmail)}
              disabled={submitting}
              className="underline underline-offset-2 hover:text-ink-text"
            >
              추천 다시 계산하기
            </button>
          )}
        </div>
      )}
    </form>
  );
}
