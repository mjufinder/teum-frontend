"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import AddMemberForm from "@/components/meeting/AddMemberForm";
import CandidateList from "@/components/meeting/CandidateList";
import MeetingActions from "@/components/meeting/MeetingActions";
import MemoBoard from "@/components/meeting/MemoBoard";
import MemberList, { memberLabel } from "@/components/meeting/MemberList";
import { ApiError, authFetch } from "@/lib/api";
import { getCandidates } from "@/lib/candidates";
import { getMeeting, getMembers, toHHMM, transferAdmin } from "@/lib/meetings";
import type { CandidateSet } from "@/types/candidate";
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
  // undefined: 불러오는 중, null: 아직 계산된 후보 없음
  const [candidateSet, setCandidateSet] = useState<CandidateSet | null | undefined>(undefined);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const handleCandidateError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setCandidateError(e instanceof ApiError ? e.message : "추천 시간을 불러오지 못했어요.");
    },
    [router]
  );

  const loadCandidates = useCallback(async () => {
    setCandidateError(null);
    try {
      setCandidateSet(await getCandidates(meetingId));
    } catch (e) {
      handleCandidateError(e);
    }
  }, [meetingId, handleCandidateError]);

  // 팀원 추가 뒤 구성원·재계산 상태·추천 시간을 함께 새로 고친다.
  const refreshAfterMemberChange = useCallback(async () => {
    const [meetingResult, membersResult] = await Promise.allSettled([
      getMeeting(meetingId),
      getMembers(meetingId),
    ]);
    if (meetingResult.status === "fulfilled") setMeeting(meetingResult.value);
    if (membersResult.status === "fulfilled") setMembers(membersResult.value);
    await loadCandidates();
  }, [meetingId, loadCandidates]);

  useEffect(() => {
    getCandidates(meetingId).then(setCandidateSet).catch(handleCandidateError);
  }, [meetingId, handleCandidateError]);

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
    // 추가는 이미 성공했으므로 목록 갱신이 실패해도 응답 값으로 보완한다.
    setMembers((prev) =>
      prev.some((m) => m.member_id === member.member_id) ? prev : [...prev, member]
    );
    await refreshAfterMemberChange();
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
          className="btn btn-secondary"
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{meeting.name}</h1>
            {meeting.needs_recalc && <span className="badge badge-accent">재계산 필요</span>}
          </div>
          {meeting.description && (
            <p className="text-sm text-muted">{meeting.description}</p>
          )}
        </div>
        {isAdmin && (
          <Link
            href={`/meetings/${meetingId}/edit`}
            className="btn btn-secondary shrink-0"
          >
            수정
          </Link>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "최소 회의시간", value: `${meeting.min_duration_min}분` },
          {
            label: "탐색 시간대",
            value: `${toHHMM(meeting.search_start_time)} ~ ${toHHMM(meeting.search_end_time)}`,
          },
          {
            label: "이동 여유시간",
            value: meeting.travel_buffer_min === 0 ? "없음" : `${meeting.travel_buffer_min}분`,
          },
        ].map((item) => (
          <div key={item.label} className="card flex flex-col gap-1 !p-5">
            <dt className="text-xs font-semibold text-muted">{item.label}</dt>
            <dd className="text-lg font-bold tabular-nums tracking-[-0.01em]">{item.value}</dd>
          </div>
        ))}
      </dl>

      <CandidateList
        meetingId={meetingId}
        candidateSet={candidateSet}
        error={candidateError}
        onRetry={loadCandidates}
        needsRecalc={meeting.needs_recalc}
        isAdmin={isAdmin}
        members={members}
        myUserId={myUserId}
        emails={emails}
      />

      <section className="flex flex-col gap-3">
        <h2 className="section-title">
          구성원 <span className="text-muted">{members.length}</span>
        </h2>
        <MemberList
          members={members}
          myUserId={myUserId}
          emails={emails}
          onTransfer={isAdmin ? handleTransfer : undefined}
          busy={transferring}
        />
        {transferError && <p className="text-sm text-danger">{transferError}</p>}
      </section>

      {isAdmin && (
        <AddMemberForm
          meetingId={meetingId}
          onAdded={handleAdded}
          onPartiallyAdded={refreshAfterMemberChange}
        />
      )}

      <MemoBoard
        meetingId={meetingId}
        myUserId={myUserId}
        isAdmin={isAdmin}
        members={members}
        emails={emails}
      />

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
