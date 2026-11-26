"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import TeumLoader from "@/components/layout/TeumLoader";
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
      const ok = confirm(
        "조건을 바꾸면 공강을 다시 계산해야 하고, 진행 중인 투표가 있으면 폐기돼요. 계속할까요?"
      );
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
      <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-3 rounded-[12px] border border-ink-line bg-ink-1 p-6">
        <p className="text-sm text-live">{error}</p>
        <Link
          href="/meetings"
          className="inline-flex h-9 items-center rounded-[8px] border border-ink-line-2 px-4 text-sm font-semibold text-ink-text hover:bg-ink-2"
        >
          내 모임으로
        </Link>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="h-6 w-28 animate-pulse rounded bg-ink-2" />
        <div className="h-72 animate-pulse rounded-[12px] border border-ink-line bg-ink-1" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/meetings/${meetingId}`}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-ink-text-3 transition-colors hover:text-ink-text"
        >
          <ArrowLeft className="size-3.5" />
          {meeting.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink-text">
          모임 수정
        </h1>
      </div>

      <MeetingForm
        initial={toFormValues(meeting)}
        submitLabel="저장"
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default function EditMeetingPage() {
  return (
    <Suspense fallback={<TeumLoader />}>
      <EditMeeting />
    </Suspense>
  );
}
