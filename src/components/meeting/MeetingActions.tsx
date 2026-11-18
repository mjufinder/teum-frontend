"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { useConfirm } from "@/components/layout/useConfirm";
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
  const [confirm, dialog] = useConfirm();
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

  async function handleLeave() {
    const ok = await confirm({
      title: `'${meetingName}' 모임에서 나갈까요?`,
      description: "나가면 이 모임의 추천 시간과 메모를 더 이상 볼 수 없어요.",
      actionLabel: "모임 나가기",
      tone: "destructive",
    });
    if (ok) run(() => leaveMeeting(meetingId), "모임에서 나가지 못했어요.");
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `'${meetingName}' 모임을 삭제할까요?`,
      description: "모든 구성원이 이 모임을 더 이상 볼 수 없어요.",
      actionLabel: "모임 삭제",
      tone: "destructive",
    });
    if (ok) run(() => deleteMeeting(meetingId), "모임을 삭제하지 못했어요.");
  }

  return (
    <VStack gap={3}>
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
        <VStack gap={0.5}>
          <Text weight="semibold">{isAdmin ? "모임 삭제" : "모임 나가기"}</Text>
          <Text type="supporting">
            {isAdmin
              ? hasOtherMembers
                ? "관리자는 구성원에게 관리자를 넘긴 뒤 모임에서 나갈 수 있어요."
                : "다른 구성원이 없어서 모임을 나가려면 삭제해야 해요."
              : "나가면 이 모임의 추천 시간과 메모를 더 이상 볼 수 없어요."}
          </Text>
        </VStack>
        <Button
          label={isAdmin ? "모임 삭제" : "모임 나가기"}
          variant="destructive"
          isLoading={busy}
          onClick={isAdmin ? handleDelete : handleLeave}
        />
      </HStack>
      {error && <Banner status="error" title={error} />}
      {dialog}
    </VStack>
  );
}
