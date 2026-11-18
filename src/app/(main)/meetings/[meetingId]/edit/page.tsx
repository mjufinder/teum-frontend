"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { ErrorNote, PageLoading } from "@/components/layout/PageState";
import { useConfirm } from "@/components/layout/useConfirm";
import MeetingForm, { type MeetingFormValues } from "@/components/meeting/MeetingForm";
import { ApiError, authFetch } from "@/lib/api";
import {
  type MeetingUpdateBody,
  getMeeting,
  getMembers,
  toHHMM,
  updateMeeting,
} from "@/lib/meetings";
import type { Meeting } from "@/types/meeting";

function toFormValues(meeting: Meeting): MeetingFormValues {
  return {
    name: meeting.name,
    description: meeting.description ?? "",
    minDuration: meeting.min_duration_min,
    searchStartTime: toHHMM(meeting.search_start_time),
    searchEndTime: toHHMM(meeting.search_end_time),
    travelBufferMin: meeting.travel_buffer_min,
  };
}

// 바뀐 값만 보낸다. 조건이 하나라도 바뀌면 서버가 재계산 필요 상태로 바꾸고 진행 중인 투표를 폐기한다.
function diff(before: MeetingFormValues, after: MeetingFormValues) {
  const info: MeetingUpdateBody = {};
  const conditions: MeetingUpdateBody = {};
  if (after.name !== before.name) info.name = after.name;
  if (after.description !== before.description) info.description = after.description;
  if (after.minDuration !== before.minDuration) {
    conditions.min_duration_min = after.minDuration;
  }
  if (after.searchStartTime !== before.searchStartTime) {
    conditions.search_start_time = after.searchStartTime;
  }
  if (after.searchEndTime !== before.searchEndTime) {
    conditions.search_end_time = after.searchEndTime;
  }
  if (after.travelBufferMin !== before.travelBufferMin) {
    conditions.travel_buffer_min = after.travelBufferMin;
  }
  return { info, conditions };
}

function EditMeeting() {
  const router = useRouter();
  const [confirm, dialog] = useConfirm();
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMeeting(meetingId),
      getMembers(meetingId),
      authFetch<{ user_id: number }>("/api/v1/auth/me"),
    ])
      .then(([m, members, me]) => {
        const isAdmin = members.some(
          (x) => x.user_id === me.user_id && x.role === "ADMIN"
        );
        if (isAdmin) {
          setMeeting(m);
        } else {
          router.replace(`/meetings/${meetingId}`);
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
        } else if (e instanceof ApiError && e.status === 403) {
          setError("이 모임의 구성원이 아니에요.");
        } else if (e instanceof ApiError && e.status === 404) {
          setError("모임을 찾을 수 없어요.");
        } else {
          setError(e instanceof ApiError ? e.message : "불러오지 못했어요.");
        }
      });
  }, [meetingId, router]);

  async function handleSubmit(values: MeetingFormValues) {
    if (!meeting) return;
    const { info, conditions } = diff(toFormValues(meeting), values);
    if (Object.keys(conditions).length > 0) {
      const ok = await confirm({
        title: "조건을 바꿀까요?",
        description: "조건을 바꾸면 공강을 다시 계산해야 하고, 진행 중인 투표가 있으면 폐기돼요.",
        actionLabel: "바꾸기",
      });
      if (!ok) return false;
    }
    const body = { ...info, ...conditions };
    if (Object.keys(body).length > 0) {
      await updateMeeting(meetingId, body);
    }
    router.replace(`/meetings/${meetingId}`);
  }

  if (error) {
    return (
      <ErrorNote
        message={error}
        action={<Button label="내 모임으로" variant="secondary" size="sm" href="/meetings" />}
      />
    );
  }

  if (!meeting) {
    return <PageLoading />;
  }

  return (
    <div className="max-w-[560px]">
      <VStack gap={6}>
        <VStack gap={1}>
          <Heading level={1}>모임 수정</Heading>
          <Text color="secondary">{meeting.name}</Text>
        </VStack>
        <MeetingForm initial={toFormValues(meeting)} submitLabel="저장" onSubmit={handleSubmit} />
        {dialog}
      </VStack>
    </div>
  );
}

export default function EditMeetingPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditMeeting />
    </Suspense>
  );
}
