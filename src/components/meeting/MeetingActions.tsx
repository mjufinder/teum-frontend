"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { deleteMeeting, leaveMeeting } from "@/lib/meetings";

interface MeetingActionsProps {
  meetingId: string;
  meetingName: string;
  isAdmin: boolean;
  hasOtherMembers: boolean;
}

// 모임 나가기(MEET-05)와 모임 삭제(MEET-07). 관리자는 권한을 넘긴 뒤에만 나갈 수 있다.
export default function MeetingActions({
  meetingId,
  meetingName,
  isAdmin,
  hasOtherMembers,
}: MeetingActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, fallback: string) {
    setError(null);
    setBusy(true);
    try {
      await action();
      router.replace("/meetings");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : fallback);
      setBusy(false);
    }
  }

  function handleLeave() {
    if (!confirm(`'${meetingName}' 모임에서 나갈까요?`)) return;
    run(() => leaveMeeting(meetingId), "모임에서 나가지 못했어요.");
  }

  function handleDelete() {
    if (
      !confirm(
        `'${meetingName}' 모임을 삭제할까요? 모든 구성원이 이 모임을 더 이상 볼 수 없어요.`
      )
    ) {
      return;
    }
    run(() => deleteMeeting(meetingId), "모임을 삭제하지 못했어요.");
  }

  return (
    <section className="flex flex-col items-start gap-2 rounded-lg border border-line bg-surface p-5">
      {isAdmin ? (
        <>
          <p className="text-sm text-muted">
            {hasOtherMembers
              ? "관리자는 구성원에게 관리자를 넘긴 뒤 모임에서 나갈 수 있어요."
              : "다른 구성원이 없어서 모임을 나가려면 삭제해야 해요."}
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded-md border border-danger px-4 py-2 text-sm text-danger hover:bg-red-50 disabled:opacity-50"
          >
            {busy ? "처리 중..." : "모임 삭제"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleLeave}
          disabled={busy}
          className="rounded-md border border-danger px-4 py-2 text-sm text-danger hover:bg-red-50 disabled:opacity-50"
        >
          {busy ? "처리 중..." : "모임 나가기"}
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
