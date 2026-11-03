"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import MeetingForm from "@/components/meeting/MeetingForm";
import { ApiError, authFetch } from "@/lib/api";
import { getMeeting, getMembers, updateMeeting } from "@/lib/meetings";
import type { Meeting } from "@/types/meeting";

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

  async function handleSubmit(name: string, minDuration: number) {
    if (!meeting) return;
    const body: { name?: string; minDuration?: number } = {};
    if (name !== meeting.name) body.name = name;
    if (minDuration !== meeting.min_duration_min) {
      const ok = confirm(
        "최소 회의시간을 바꾸면 진행 중인 투표가 있을 경우 폐기돼요."
      );
      if (!ok) return false;
      body.minDuration = minDuration;
    }
    if (Object.keys(body).length > 0) {
      await updateMeeting(meetingId, body);
    }
    router.replace(`/meetings/${meetingId}`);
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-danger">{error}</p>
        <Link
          href="/meetings"
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm hover:bg-zinc-50"
        >
          내 모임으로
        </Link>
      </div>
    );
  }

  if (!meeting) {
    return <p className="text-sm text-muted">불러오는 중...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">모임 수정</h1>
      <MeetingForm
        initialName={meeting.name}
        initialMinDuration={meeting.min_duration_min}
        submitLabel="저장"
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default function EditMeetingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중...</p>}>
      <EditMeeting />
    </Suspense>
  );
}
