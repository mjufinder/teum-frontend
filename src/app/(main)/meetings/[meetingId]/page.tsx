"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import AddMemberForm from "@/components/meeting/AddMemberForm";
import MemberList from "@/components/meeting/MemberList";
import { ApiError, authFetch } from "@/lib/api";
import { getMeeting, getMembers } from "@/lib/meetings";
import type { Meeting, Member } from "@/types/meeting";

function MeetingDetail() {
  const router = useRouter();
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMeeting(meetingId),
      getMembers(meetingId),
      authFetch<{ user_id: number }>("/api/v1/auth/me"),
    ])
      .then(([m, list, me]) => {
        setMeeting(m);
        setMembers(list);
        setMyUserId(me.user_id);
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

  async function handleAdded(member: Member, email: string) {
    setEmails((prev) => ({ ...prev, [member.user_id]: email }));
    setMembers(await getMembers(meetingId));
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

  if (!meeting || myUserId === null) {
    return <p className="text-sm text-muted">불러오는 중...</p>;
  }

  const isAdmin = members.some(
    (m) => m.user_id === myUserId && m.role === "ADMIN"
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{meeting.name}</h1>
        {isAdmin && (
          <Link
            href={`/meetings/${meetingId}/edit`}
            className="rounded-md border border-line bg-surface px-4 py-2 text-sm hover:bg-zinc-50"
          >
            수정
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-5 text-sm">
        <span className="text-muted">최소 회의시간</span>
        <span>{meeting.min_duration_min}분</span>
        {meeting.needs_recalc && (
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
            재계산 필요
          </span>
        )}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">구성원</h2>
        <MemberList members={members} myUserId={myUserId} emails={emails} />
      </section>
      {isAdmin && <AddMemberForm meetingId={meetingId} onAdded={handleAdded} />}
    </div>
  );
}

export default function MeetingDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중...</p>}>
      <MeetingDetail />
    </Suspense>
  );
}
