"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { AvatarGroup, AvatarGroupOverflow } from "@astryxdesign/core/AvatarGroup";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/20/solid";

import { ErrorNote, PageLoading } from "@/components/layout/PageState";
import { useConfirm } from "@/components/layout/useConfirm";
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
  const [tab, setTab] = useState("candidates");
  const [confirm, dialog] = useConfirm();

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
    const ok = await confirm({
      title: `${label}에게 관리자를 넘길까요?`,
      description: "넘기면 나는 일반 구성원이 되고 모임 수정·팀원 추가를 할 수 없어요.",
      actionLabel: "관리자 넘기기",
    });
    if (!ok) return;
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
      <ErrorNote
        message={error}
        action={<Button label="내 모임으로" variant="secondary" size="sm" href="/meetings" />}
      />
    );
  }

  if (!meeting || myUserId === null) {
    return <PageLoading />;
  }

  const isAdmin = members.some(
    (m) => m.user_id === myUserId && m.role === "ADMIN"
  );
  const hasOtherMembers = members.some((m) => m.user_id !== myUserId);

  return (
    <VStack gap={6}>
      <HStack hAlign="between" vAlign="end" gap={4} wrap="wrap">
        <VStack gap={2}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <Heading level={1}>{meeting.name}</Heading>
            {meeting.needs_recalc && <Badge variant="warning" label="재계산 필요" />}
          </HStack>
          {meeting.description && <Text color="secondary">{meeting.description}</Text>}
          <Text color="secondary" hasTabularNumbers>
            {meeting.min_duration_min}분 이상, {toHHMM(meeting.search_start_time)}~
            {toHHMM(meeting.search_end_time)} 사이에서 찾아요.
            {meeting.travel_buffer_min > 0 &&
              ` 수업 앞뒤로 ${meeting.travel_buffer_min}분은 비워 둬요.`}
          </Text>
        </VStack>
        <HStack gap={3} vAlign="center">
          <AvatarGroup size="sm">
            {members.slice(0, 5).map((m) => (
              <Avatar key={m.member_id} name={memberLabel(m, myUserId, emails)} />
            ))}
            {members.length > 5 && <AvatarGroupOverflow count={members.length - 5} />}
          </AvatarGroup>
          {isAdmin && (
            <Button
              label="조건 수정"
              variant="secondary"
              icon={<Icon icon={AdjustmentsHorizontalIcon} />}
              href={`/meetings/${meetingId}/edit`}
            />
          )}
        </HStack>
      </HStack>

      <TabList value={tab} onChange={setTab} hasDivider role="tablist">
        <Tab value="candidates" label="추천 시간" panelId="panel-candidates" />
        <Tab
          value="members"
          label="팀원"
          panelId="panel-members"
          endContent={<Badge label={String(members.length)} />}
        />
        <Tab value="memos" label="메모" panelId="panel-memos" />
        <Tab value="manage" label="모임 관리" panelId="panel-manage" />
      </TabList>

      {/* 탭을 옮겨도 쓰던 메모나 고른 투표가 사라지지 않도록 숨기기만 한다 */}
      <div id="panel-candidates" role="tabpanel" hidden={tab !== "candidates"}>
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
          searchStart={meeting.search_start_time}
          searchEnd={meeting.search_end_time}
          onGoToMembers={() => setTab("members")}
        />
      </div>

      <div id="panel-members" role="tabpanel" hidden={tab !== "members"}>
        <div className="max-w-[640px]">
          <VStack gap={6}>
            {isAdmin && (
              <AddMemberForm
                meetingId={meetingId}
                onAdded={handleAdded}
                onPartiallyAdded={refreshAfterMemberChange}
              />
            )}
            <MemberList
              members={members}
              myUserId={myUserId}
              emails={emails}
              onTransfer={isAdmin ? handleTransfer : undefined}
              busy={transferring}
            />
            {transferError && <ErrorNote message={transferError} />}
          </VStack>
        </div>
      </div>

      <div id="panel-memos" role="tabpanel" hidden={tab !== "memos"}>
        <div className="max-w-[640px]">
          <MemoBoard
            meetingId={meetingId}
            myUserId={myUserId}
            isAdmin={isAdmin}
            members={members}
            emails={emails}
          />
        </div>
      </div>

      <div id="panel-manage" role="tabpanel" hidden={tab !== "manage"}>
        <div className="max-w-[640px]">
          <MeetingActions
            meetingId={meetingId}
            meetingName={meeting.name}
            isAdmin={isAdmin}
            hasOtherMembers={hasOtherMembers}
          />
        </div>
      </div>
      {dialog}
    </VStack>
  );
}

export default function MeetingDetailPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MeetingDetail />
    </Suspense>
  );
}
