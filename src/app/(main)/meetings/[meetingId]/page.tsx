"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import AddMemberForm from "@/components/meeting/AddMemberForm";
import MeetingActions from "@/components/meeting/MeetingActions";
import MemberList, { memberLabel } from "@/components/meeting/MemberList";
import { ApiError, authFetch } from "@/lib/api";
import { getMeeting, getMembers, toHHMM, transferAdmin } from "@/lib/meetings";
import type { Meeting, Member } from "@/types/meeting";

function MeetingDetail() {
  const router = useRouter();
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

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
    try {
      setMembers(await getMembers(meetingId));
    } catch {
      // 추가는 이미 성공했으므로 목록 갱신 실패는 응답 값으로 보완한다.
      setMembers((prev) =>
        prev.some((m) => m.member_id === member.member_id) ? prev : [...prev, member]
      );
    }
  }

  async function handleTransfer(target: Member) {
    if (myUserId === null) return;
    const label = memberLabel(target, myUserId, emails);
    if (
      !confirm(
        `${label}에게 관리자를 넘길까요? 넘기면 나는 일반 구성원이 되고 모임 수정·팀원 추가를 할 수 없어요.`
      )
    ) {
      return;
    }
    setTransferError(null);
    setTransferring(true);
    try {
      setMembers(await transferAdmin(meetingId, target.user_id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setTransferError(e instanceof ApiError ? e.message : "관리자를 넘기지 못했어요.");
    } finally {
      setTransferring(false);
    }
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
  const hasOtherMembers = members.some((m) => m.user_id !== myUserId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{meeting.name}</h1>
          {meeting.description && (
            <p className="text-sm text-muted">{meeting.description}</p>
          )}
        </div>
        {isAdmin && (
          <Link
            href={`/meetings/${meetingId}/edit`}
            className="shrink-0 rounded-md border border-line bg-surface px-4 py-2 text-sm hover:bg-zinc-50"
          >
            수정
          </Link>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-line bg-surface p-5 text-sm">
        <dt className="text-muted">최소 회의시간</dt>
        <dd className="flex items-center gap-2">
          {meeting.min_duration_min}분
          {meeting.needs_recalc && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
              재계산 필요
            </span>
          )}
        </dd>
        <dt className="text-muted">탐색 시간대</dt>
        <dd>
          {toHHMM(meeting.search_start_time)} ~ {toHHMM(meeting.search_end_time)}
        </dd>
        <dt className="text-muted">이동 여유시간</dt>
        <dd>
          {meeting.travel_buffer_min === 0 ? "없음" : `${meeting.travel_buffer_min}분`}
        </dd>
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">구성원</h2>
        <MemberList
          members={members}
          myUserId={myUserId}
          emails={emails}
          onTransfer={isAdmin ? handleTransfer : undefined}
          busy={transferring}
        />
        {transferError && <p className="text-sm text-danger">{transferError}</p>}
      </section>

      {isAdmin && <AddMemberForm meetingId={meetingId} onAdded={handleAdded} />}

      <MeetingActions
        meetingId={meetingId}
        meetingName={meeting.name}
        isAdmin={isAdmin}
        hasOtherMembers={hasOtherMembers}
      />
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
