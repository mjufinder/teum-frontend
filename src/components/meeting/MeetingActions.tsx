"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmDialog from "@/components/meeting/ConfirmDialog";
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
  const [confirmMode, setConfirmMode] = useState<"leave" | "delete" | null>(null);
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
      setConfirmMode(null);
    }
  }

  return (
    <>
      <section className="flex flex-col items-start gap-2.5 rounded-[12px] border border-ink-line bg-ink-1 p-4">
        {isAdmin ? (
          <>
            <p className="text-xs leading-relaxed text-ink-text-3">
              {hasOtherMembers
                ? "관리자는 구성원에게 관리자를 넘긴 뒤 모임에서 나갈 수 있어요."
                : "다른 구성원이 없어서 모임을 나가려면 삭제해야 해요."}
            </p>
            <button
              type="button"
              onClick={() => setConfirmMode("delete")}
              disabled={busy}
              className="inline-flex h-8 items-center rounded-[8px] border border-live/40 px-3 text-xs font-semibold text-live transition-colors hover:bg-live/10 disabled:opacity-50"
            >
              {busy ? "처리 중..." : "모임 삭제"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmMode("leave")}
            disabled={busy}
            className="inline-flex h-8 items-center rounded-[8px] border border-live/40 px-3 text-xs font-semibold text-live transition-colors hover:bg-live/10 disabled:opacity-50"
          >
            {busy ? "처리 중..." : "모임 나가기"}
          </button>
        )}
        {error && <p className="text-xs text-live">{error}</p>}
      </section>

      <ConfirmDialog
        open={confirmMode !== null}
        title={confirmMode === "delete" ? `'${meetingName}' 모임을 삭제할까요?` : `'${meetingName}' 모임에서 나갈까요?`}
        description={
          confirmMode === "delete"
            ? "삭제하면 모든 구성원이 이 모임을 더 이상 볼 수 없고, 추천 시간과 메모도 함께 사라져요."
            : "모임에서 나가면 더 이상 추천 시간과 메모를 볼 수 없어요."
        }
        confirmLabel={confirmMode === "delete" ? "삭제" : "나가기"}
        tone="danger"
        busy={busy}
        onConfirm={() => {
          if (confirmMode === "delete") {
            run(() => deleteMeeting(meetingId), "모임을 삭제하지 못했어요.");
          } else if (confirmMode === "leave") {
            run(() => leaveMeeting(meetingId), "모임에서 나가지 못했어요.");
          }
        }}
        onCancel={() => setConfirmMode(null)}
      />
    </>
  );
}
