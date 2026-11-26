"use client";

import { ArrowLeft, Check, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import TeumLoader from "@/components/layout/TeumLoader";
import AddMemberForm from "@/components/meeting/AddMemberForm";
import AvailabilityHeatmap from "@/components/meeting/AvailabilityHeatmap";
import CandidateList, { formatSlot } from "@/components/meeting/CandidateList";
import ConfirmDialog from "@/components/meeting/ConfirmDialog";
import ConfirmedMeetingModal from "@/components/meeting/ConfirmedMeetingModal";
import ConfirmedSchedule from "@/components/meeting/ConfirmedSchedule";
import MeetingActions from "@/components/meeting/MeetingActions";
import MeetingForm, { type MeetingFormValues } from "@/components/meeting/MeetingForm";
import MemoBoard from "@/components/meeting/MemoBoard";
import MemberList, { memberLabel } from "@/components/meeting/MemberList";
import ShareLinkCard from "@/components/meeting/ShareLinkCard";
import { ApiError, authFetch } from "@/lib/api";
import { addCustomCandidate, getCandidates, getMeetingAvailability } from "@/lib/candidates";
import {
  type MeetingUpdateBody,
  getMeeting,
  getMembers,
  toHHMM,
  transferAdmin,
  updateMeeting,
} from "@/lib/meetings";
import type { Candidate, CandidateSet, MeetingAvailability } from "@/types/candidate";
import type { Meeting, Member } from "@/types/meeting";

function StepBar({
  hasMembers,
  hasCandidates,
  voteClosed,
  confirmed,
}: {
  hasMembers: boolean;
  hasCandidates: boolean;
  voteClosed: boolean;
  confirmed: boolean;
}) {
  const steps = [
    { label: "팀원 구성", done: confirmed || hasMembers },
    { label: "공강 매칭", done: confirmed || hasCandidates },
    { label: "투표 · 확정", done: confirmed || voteClosed },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
      {steps.map((s, idx) => (
        <div key={s.label} className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${
              s.done
                ? "bg-neon/12 text-neon"
                : "bg-ink-2 text-ink-text-weak"
            }`}
          >
            {s.done ? (
              <Check className="size-3" strokeWidth={2.5} />
            ) : (
              <span aria-hidden className="size-1.5 rounded-full bg-ink-text-weak/50" />
            )}
            {s.label}
          </span>
          {idx < steps.length - 1 && (
            <span aria-hidden className="h-px w-3 bg-ink-line-2" />
          )}
        </div>
      ))}
      {confirmed && (
        <span className="rounded-full bg-neon px-2 py-0.5 text-[10px] font-bold text-on-neon">
          완료
        </span>
      )}
    </div>
  );
}

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
  const [availability, setAvailability] = useState<MeetingAvailability | undefined>(undefined);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<Candidate | null>(null);
  const [focusedCandidateId, setFocusedCandidateId] = useState<number | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [editingOpen, setEditingOpen] = useState(false);
  const [pendingEditBody, setPendingEditBody] = useState<MeetingUpdateBody | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeSection, setActiveSection] = useState("section-heatmap");
  const [confirmedModalDismissed, setConfirmedModalDismissed] = useState(false);

  const handleAvailabilityError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setAvailabilityError(e instanceof ApiError ? e.message : "히트맵을 불러오지 못했어요.");
    },
    [router]
  );

  const loadAvailability = useCallback(async () => {
    setAvailabilityError(null);
    try {
      setAvailability(await getMeetingAvailability(meetingId));
    } catch (e) {
      handleAvailabilityError(e);
    }
  }, [meetingId, handleAvailabilityError]);

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
    await Promise.all([loadCandidates(), loadAvailability()]);
  }, [meetingId, loadCandidates, loadAvailability]);

  useEffect(() => {
    getCandidates(meetingId).then(setCandidateSet).catch(handleCandidateError);
    getMeetingAvailability(meetingId).then(setAvailability).catch(handleAvailabilityError);
  }, [meetingId, handleCandidateError, handleAvailabilityError]);

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

  async function handleAddCustomCandidate(input: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  }) {
    try {
      const updated = await addCustomCandidate(meetingId, input);
      setCandidateSet(updated);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      throw new Error(e instanceof ApiError ? e.message : "후보 시간을 추가하지 못했어요.");
    }
  }

  async function doTransfer(target: Member) {
    setTransferError(null);
    setTransferring(true);
    try {
      setMembers(await transferAdmin(meetingId, target.user_id));
      setTransferTarget(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setTransferError(e instanceof ApiError ? e.message : "관리자를 넘기지 못했어요.");
      setTransferTarget(null);
    } finally {
      setTransferring(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[12px] border border-ink-line bg-ink-1 p-6">
        <p className="text-sm text-live">{error}</p>
        <Link
          href="/meetings"
          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-ink-line-2 px-4 text-sm font-semibold text-ink-text hover:bg-ink-2"
        >
          <ArrowLeft className="size-3.5" />
          내 모임으로
        </Link>
      </div>
    );
  }

  if (!meeting || myUserId === null) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-24 animate-pulse rounded-[12px] bg-ink-1" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="h-64 animate-pulse rounded-[12px] border border-ink-line bg-ink-1" />
          <div className="h-64 animate-pulse rounded-[12px] border border-ink-line bg-ink-1" />
        </div>
      </div>
    );
  }

  const isAdmin = members.some(
    (m) => m.user_id === myUserId && m.role === "ADMIN"
  );
  const hasOtherMembers = members.some((m) => m.user_id !== myUserId);
  const hasCandidates = Boolean(
    candidateSet &&
      candidateSet.result_status !== "NO_CANDIDATE" &&
      candidateSet.candidates.length > 0 &&
      !meeting.needs_recalc
  );
  const voteClosed = candidateSet?.vote_status === "CLOSED";

  async function applyMeetingUpdate(body: MeetingUpdateBody) {
    setSavingEdit(true);
    try {
      const updated = await updateMeeting(meetingId, body);
      setMeeting(updated);
      setEditingOpen(false);
      setPendingEditBody(null);
      await loadCandidates();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleInlineEditSubmit(values: MeetingFormValues) {
    if (!meeting) return;
    const body: MeetingUpdateBody = {};
    let conditionsChanged = false;
    if (values.name !== meeting.name) body.name = values.name;
    if (values.description !== (meeting.description ?? "")) body.description = values.description;
    if (values.minDuration !== meeting.min_duration_min) {
      body.min_duration_min = values.minDuration;
      conditionsChanged = true;
    }
    if (values.searchStartTime !== toHHMM(meeting.search_start_time)) {
      body.search_start_time = values.searchStartTime;
      conditionsChanged = true;
    }
    if (values.searchEndTime !== toHHMM(meeting.search_end_time)) {
      body.search_end_time = values.searchEndTime;
      conditionsChanged = true;
    }
    if (values.travelBufferMin !== meeting.travel_buffer_min) {
      body.travel_buffer_min = values.travelBufferMin;
      conditionsChanged = true;
    }

    if (Object.keys(body).length === 0) {
      setEditingOpen(false);
      return;
    }
    if (conditionsChanged) {
      setPendingEditBody(body);
      return false;
    }
    await applyMeetingUpdate(body);
  }

  return (
    <div className="relative flex flex-col gap-8">
      {/* 은은한 상단 네온 글로우 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-44 w-full max-w-[36rem] -translate-x-1/2 rounded-full bg-neon/[0.04] blur-3xl"
      />

      {/* 상단 브레드크럼 + 제목 + 조건 요약 */}
      <header className="relative flex flex-col gap-3.5 border-b border-ink-line pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/meetings"
            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-ink-text-3 transition-colors hover:text-ink-text"
          >
            <ArrowLeft className="size-3.5" />
            내 모임
          </Link>

          <StepBar
            hasMembers={members.length > 1}
            hasCandidates={hasCandidates}
            voteClosed={Boolean(voteClosed)}
            confirmed={Boolean(meeting.confirmed_schedule)}
          />
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[1.65rem] font-bold tracking-[-0.025em] text-ink-text">
                {meeting.name}
              </h1>
              {meeting.needs_recalc && (
                <span className="rounded border border-neon/40 bg-neon/10 px-1.5 py-0.5 text-[0.68rem] font-bold text-neon">
                  재계산 필요
                </span>
              )}
            </div>
            {meeting.description && (
              <p className="text-sm text-ink-text-3">{meeting.description}</p>
            )}
            <p className="text-xs text-ink-text-3 tabular-nums">
              최소 <strong className="text-ink-text-2">{meeting.min_duration_min}분</strong> ·{" "}
              <strong className="text-ink-text-2">
                {toHHMM(meeting.search_start_time)}–{toHHMM(meeting.search_end_time)}
              </strong>{" "}
              탐색
              {meeting.travel_buffer_min > 0 && (
                <> · 수업 앞뒤 여유 {meeting.travel_buffer_min}분</>
              )}
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setEditingOpen((prev) => !prev)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] border border-ink-line-2 bg-ink-1 px-3.5 text-xs font-semibold text-ink-text transition-colors hover:bg-ink-2"
            >
              {editingOpen ? (
                <>
                  <X className="size-3.5 text-ink-text-3" />
                  닫기
                </>
              ) : (
                <>
                  <Pencil className="size-3.5 text-ink-text-3" />
                  수정
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* #2 인라인 조건 수정 패널 */}
      {isAdmin && editingOpen && (
        <MeetingForm
          initial={{
            name: meeting.name,
            description: meeting.description ?? "",
            minDuration: meeting.min_duration_min,
            searchStartTime: toHHMM(meeting.search_start_time),
            searchEndTime: toHHMM(meeting.search_end_time),
            travelBufferMin: meeting.travel_buffer_min,
          }}
          submitLabel="변경사항 저장"
          onSubmit={handleInlineEditSubmit}
        />
      )}

      {/* #7 모바일 섹션 스티키 탭 메뉴 */}
      <nav
        aria-label="섹션 바로가기"
        className="sticky top-16 z-20 -mx-5 flex items-center border-b border-ink-line bg-ink-base/90 px-5 backdrop-blur-md lg:hidden"
      >
        {[
          { id: "section-heatmap", label: "히트맵" },
          { id: "section-candidates", label: "후보 · 투표" },
          { id: "section-memos", label: "메모" },
          { id: "section-members", label: "구성원" },
        ].map((tab) => {
          const active = activeSection === tab.id;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={() => setActiveSection(tab.id)}
              className={`-mb-px flex-1 border-b-2 py-2.5 text-center text-xs font-bold whitespace-nowrap transition-colors ${
                active
                  ? "border-neon text-neon"
                  : "border-transparent text-ink-text-3 hover:text-ink-text"
              }`}
            >
              {tab.label}
            </a>
          );
        })}
      </nav>

      {/* 본문 2컬럼 (메인 + 우측 고정 인스펙터) */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-8">
          {meeting.confirmed_schedule && (
            <ConfirmedSchedule
              meetingId={meetingId}
              meetingName={meeting.name}
              description={meeting.description}
              confirmedSlot={meeting.confirmed_schedule}
              slotLabel={formatSlot(
                meeting.confirmed_schedule.day_of_week,
                meeting.confirmed_schedule.start_time,
                meeting.confirmed_schedule.end_time
              )}
              initialShareToken={meeting.share_token ?? null}
              onShareTokenIssued={(token) =>
                setMeeting((prev) => (prev ? { ...prev, share_token: token } : prev))
              }
              isAdmin={isAdmin}
            />
          )}

          <div id="section-heatmap" className="scroll-mt-28">
            <AvailabilityHeatmap
              availability={availability}
              error={availabilityError}
              onRetry={loadAvailability}
              onAddCandidate={meeting.confirmed_schedule ? undefined : handleAddCustomCandidate}
              onSelectCandidate={(id) => {
                setFocusedCandidateId(null);
                requestAnimationFrame(() => setFocusedCandidateId(id));
              }}
              selectedCandidateIds={selectedCandidateIds}
              confirmedSlot={meeting.confirmed_schedule ?? null}
              candidates={candidateSet?.candidates ?? []}
              highlightedCandidate={hoveredCandidate}
              members={members}
              myUserId={myUserId}
              emails={emails}
              searchStartTime={meeting.search_start_time}
              searchEndTime={meeting.search_end_time}
              minDurationMin={meeting.min_duration_min}
            />
          </div>

          <div id="section-candidates" className="scroll-mt-28">
            <CandidateList
              meetingId={meetingId}
              meetingName={meeting.name}
              candidateSet={candidateSet}
              error={candidateError}
              onRetry={loadCandidates}
              onCandidateChange={setCandidateSet}
              onHoverCandidate={setHoveredCandidate}
              focusedCandidateId={focusedCandidateId}
              selectedIds={selectedCandidateIds}
              onSelectedIdsChange={setSelectedCandidateIds}
              confirmedSchedule={meeting.confirmed_schedule ?? null}
              onConfirmed={(slot) =>
                setMeeting((prev) => (prev ? { ...prev, confirmed_schedule: slot } : prev))
              }
              needsRecalc={meeting.needs_recalc}
              isAdmin={isAdmin}
              members={members}
              myUserId={myUserId}
              emails={emails}
            />
          </div>

          <div id="section-memos" className="scroll-mt-28">
            <MemoBoard
              meetingId={meetingId}
              myUserId={myUserId}
              isAdmin={isAdmin}
              members={members}
              emails={emails}
            />
          </div>
        </div>

        <aside id="section-members" className="flex scroll-mt-28 flex-col gap-4 lg:sticky lg:top-24">
          <section className="flex flex-col gap-4 rounded-[12px] border border-ink-line bg-ink-1 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-text">구성원</h2>
              <span className="text-xs font-semibold text-ink-text-weak tabular-nums">
                {members.length}명
              </span>
            </div>

            <MemberList
              members={members}
              myUserId={myUserId}
              emails={emails}
              availableMemberIds={hoveredCandidate?.available_member_ids ?? null}
              onTransfer={isAdmin ? setTransferTarget : undefined}
              busy={transferring}
            />

            {transferError && <p className="text-xs text-live">{transferError}</p>}

            {isAdmin && (
              <AddMemberForm
                meetingId={meetingId}
                onAdded={handleAdded}
                onPartiallyAdded={refreshAfterMemberChange}
              />
            )}
          </section>

          <ShareLinkCard
            meetingId={meetingId}
            isAdmin={isAdmin}
            initialShareToken={meeting.share_token ?? null}
            onShareTokenIssued={(token) =>
              setMeeting((prev) => (prev ? { ...prev, share_token: token } : prev))
            }
          />

          <MeetingActions
            meetingId={meetingId}
            meetingName={meeting.name}
            isAdmin={isAdmin}
            hasOtherMembers={hasOtherMembers}
          />
        </aside>
      </div>

      <ConfirmDialog
        open={transferTarget !== null}
        title={
          transferTarget
            ? `${memberLabel(transferTarget, myUserId, emails)}에게 관리자를 넘길까요?`
            : ""
        }
        description="넘기면 나는 일반 구성원이 되고 모임 수정·팀원 추가를 할 수 없어요."
        confirmLabel="관리자 넘기기"
        busy={transferring}
        onConfirm={() => {
          if (transferTarget) doTransfer(transferTarget);
        }}
        onCancel={() => setTransferTarget(null)}
      />

      <ConfirmDialog
        open={pendingEditBody !== null}
        title="탐색 조건을 변경할까요?"
        description="조건을 바꾸면 공강을 다시 계산해야 하고, 진행 중인 투표가 있으면 폐기돼요."
        confirmLabel="변경사항 저장"
        busy={savingEdit}
        onConfirm={() => {
          if (pendingEditBody) applyMeetingUpdate(pendingEditBody);
        }}
        onCancel={() => setPendingEditBody(null)}
      />

      {meeting.confirmed_schedule && (
        <ConfirmedMeetingModal
          open={!confirmedModalDismissed}
          meetingId={meetingId}
          meetingName={meeting.name}
          slotLabel={formatSlot(
            meeting.confirmed_schedule.day_of_week,
            meeting.confirmed_schedule.start_time,
            meeting.confirmed_schedule.end_time
          )}
          shareToken={meeting.share_token ?? null}
          isAdmin={isAdmin}
          onShareTokenIssued={(token) =>
            setMeeting((prev) => (prev ? { ...prev, share_token: token } : prev))
          }
          onClose={() => setConfirmedModalDismissed(true)}
        />
      )}
    </div>
  );
}

export default function MeetingDetailPage() {
  return (
    <Suspense fallback={<TeumLoader />}>
      <MeetingDetail />
    </Suspense>
  );
}
