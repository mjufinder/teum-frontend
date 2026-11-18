"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { AvatarGroup } from "@astryxdesign/core/AvatarGroup";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { VStack } from "@astryxdesign/core/VStack";
import { HandThumbUpIcon } from "@heroicons/react/20/solid";

import { useConfirm } from "@/components/layout/useConfirm";
import ConfirmedSchedule from "@/components/meeting/ConfirmedSchedule";
import { memberLabel } from "@/components/meeting/MemberList";
import WeekMap from "@/components/meeting/WeekMap";
import { ApiError } from "@/lib/api";
import { confirmSchedule } from "@/lib/confirm";
import { toHHMM } from "@/lib/meetings";
import { DAY_LABELS } from "@/lib/timetable";
import { closeVote, getTally, submitVote } from "@/lib/votes";
import type { Candidate, CandidateSet } from "@/types/candidate";
import type { Member } from "@/types/meeting";
import type { Tally } from "@/types/vote";

interface CandidateListProps {
  meetingId: string;
  // undefined: 불러오는 중, null: 아직 계산된 후보 없음
  candidateSet: CandidateSet | null | undefined;
  error: string | null;
  onRetry: () => void;
  needsRecalc: boolean;
  isAdmin: boolean;
  members: Member[];
  myUserId: number;
  emails: Record<number, string>;
  // 탐색 시간대. 추천 시간 지도를 이 범위로 그린다.
  searchStart: string;
  searchEnd: string;
  // 팀원 추가 화면으로 이동 (추천이 아직 없을 때 안내 버튼)
  onGoToMembers: () => void;
}

function formatCalculatedAt(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

export function formatSlot(dayOfWeek: number, start: string, end: string) {
  return `${DAY_LABELS[dayOfWeek]}요일 ${toHHMM(start)} ~ ${toHHMM(end)}`;
}

// 팀원 추가 시 서버가 자동 계산한 추천 시간 Top 3 (MATCH) + 투표·집계·마감·확정 (VOTE-01~03)
export default function CandidateList(props: CandidateListProps) {
  const { meetingId, candidateSet, error, onRetry, isAdmin, onGoToMembers } = props;

  if (error) {
    return (
      <Banner
        status="error"
        title={error}
        endContent={<Button label="다시 불러오기" variant="secondary" size="sm" onClick={onRetry} />}
      />
    );
  }

  if (candidateSet === undefined) {
    return (
      <div className="grid min-h-[200px] place-items-center">
        <Spinner size="lg" label="추천 시간을 불러오는 중" />
      </div>
    );
  }

  if (candidateSet === null) {
    return (
      <EmptyState
        title="아직 계산된 추천 시간이 없어요"
        description={
          isAdmin
            ? "팀원을 추가하면 모두의 시간표로 자동 계산돼요."
            : "관리자가 팀원을 추가하면 자동으로 계산돼요."
        }
        actions={
          isAdmin ? <Button label="팀원 추가하기" variant="primary" onClick={onGoToMembers} /> : undefined
        }
      />
    );
  }

  const empty =
    candidateSet.result_status === "NO_CANDIDATE" || candidateSet.candidates.length === 0;

  if (empty) {
    return (
      <EmptyState
        title="지금 조건으로는 함께 비는 시간이 없어요"
        description="최소 회의시간을 줄이거나 탐색 시간대를 넓혀 보세요."
        actions={
          isAdmin ? (
            <Button label="조건 수정하기" variant="primary" href={`/meetings/${meetingId}/edit`} />
          ) : undefined
        }
      />
    );
  }

  // 후보 묶음이 바뀌면 선택·집계 상태를 새로 시작한다
  return <CandidateBoard key={candidateSet.set_id} {...props} candidateSet={candidateSet} />;
}

function CandidateBoard({
  meetingId,
  candidateSet,
  needsRecalc,
  isAdmin,
  members,
  myUserId,
  emails,
  searchStart,
  searchEnd,
}: CandidateListProps & { candidateSet: CandidateSet }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const setId = candidateSet.set_id;
  const [tally, setTally] = useState<Tally | null>(null);
  const [tallyError, setTallyError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [noAvailable, setNoAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  // undefined: 이번 화면에서 확정 안 함, null: 이미 확정돼 있었음(시간은 알 수 없음)
  const [confirmedLabel, setConfirmedLabel] = useState<string | null | undefined>(undefined);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmWarning, setConfirmWarning] = useState<string | null>(null);
  // 카드에 마우스를 올리거나 지도의 블록을 누르면 서로 같은 후보를 강조한다
  const [focusedId, setFocusedId] = useState<number | null>(
    candidateSet.candidates[0]?.candidate_id ?? null
  );

  useEffect(() => {
    getTally(meetingId, setId)
      .then(setTally)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setTallyError(e instanceof ApiError ? e.message : "투표 현황을 불러오지 못했어요.");
      });
  }, [meetingId, setId, router]);

  function handleError(e: unknown, fallback: string) {
    if (e instanceof ApiError && e.status === 401) {
      router.replace("/login");
      return;
    }
    setVoteError(e instanceof ApiError ? e.message : fallback);
  }

  // 집계가 오면 집계의 상태(마감 여부)를 우선한다
  const voteStatus = tally?.vote_status ?? candidateSet.vote_status;
  const stale = voteStatus === "DISCARDED" || (needsRecalc && voteStatus === "OPEN");
  const canVote = voteStatus === "OPEN" && !stale;
  const votesById = new Map(tally?.candidates.map((c) => [c.candidate_id, c.votes]) ?? []);
  const anyVotes = (tally?.total_ballots ?? 0) > 0;
  const winnerId = anyVotes ? tally?.winner_candidate_id ?? null : null;
  const winner = candidateSet.candidates.find((c) => c.candidate_id === winnerId);
  const total = members.length;

  function toggle(candidateId: number, pressed: boolean) {
    setNoAvailable(false);
    setSelected((prev) =>
      pressed
        ? prev.includes(candidateId)
          ? prev
          : [...prev, candidateId]
        : prev.filter((id) => id !== candidateId)
    );
  }

  function toggleNoAvailable(pressed: boolean) {
    setSelected([]);
    setNoAvailable(pressed);
  }

  async function handleVote() {
    setVoteError(null);
    setSubmitting(true);
    try {
      await submitVote(meetingId, setId, {
        candidate_ids: noAvailable ? [] : selected,
        no_available: noAvailable,
      });
      toast({ body: "투표했어요. 다시 고르고 투표하면 바뀌어요", uniqueID: "vote-submitted" });
      setTally(await getTally(meetingId, setId));
    } catch (e) {
      handleError(e, "투표하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(c: Candidate) {
    const label = formatSlot(c.day_of_week, c.start_time, c.end_time);
    const ok = await confirm({
      title: `${label}으로 확정할까요?`,
      description:
        "확정 직전에 팀원 시간표가 바뀌었는지 다시 확인해요. 모임당 한 번만 확정할 수 있어요.",
      actionLabel: "확정하기",
    });
    if (!ok) return;
    setVoteError(null);
    setConfirmWarning(null);
    setConfirmingId(c.candidate_id);
    try {
      const result = await confirmSchedule(meetingId, c.candidate_id);
      if (result.confirmed) {
        setConfirmedLabel(label);
      } else {
        setConfirmWarning(result.detail);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConfirmedLabel(null);
      } else {
        handleError(e, "일정을 확정하지 못했어요.");
      }
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleClose() {
    const ok = await confirm({
      title: "투표를 마감할까요?",
      description: "마감하면 더 이상 투표할 수 없어요.",
      actionLabel: "투표 마감",
    });
    if (!ok) return;
    setVoteError(null);
    setClosing(true);
    try {
      setTally(await closeVote(meetingId, setId));
    } catch (e) {
      handleError(e, "투표를 마감하지 못했어요.");
    } finally {
      setClosing(false);
    }
  }

  const canConfirm = isAdmin && confirmedLabel === undefined && !stale;
  const focused = candidateSet.candidates.find((c) => c.candidate_id === focusedId) ?? null;

  return (
    <VStack gap={4}>
      {confirmedLabel !== undefined && (
        <ConfirmedSchedule meetingId={meetingId} slotLabel={confirmedLabel} isAdmin={isAdmin} />
      )}
      {confirmWarning && (
        <Banner
          status="warning"
          title="확정하지 못했어요"
          description={`${confirmWarning} 팀원을 새로 추가하면 다시 계산돼요.`}
        />
      )}
      {stale && (
        <Banner
          status="warning"
          title="아래 추천은 이전 기준이에요"
          description="모임 조건이나 구성원이 바뀌었어요. 팀원을 새로 추가하면 다시 계산돼요."
        />
      )}
      {voteStatus === "CLOSED" && (
        <Banner
          status="info"
          title="투표가 마감됐어요"
          description={
            winner
              ? `최종 1위는 ${formatSlot(winner.day_of_week, winner.start_time, winner.end_time)}이에요.`
              : undefined
          }
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
            <Text type="supporting" hasTabularNumbers>
              {tally
                ? `${total}명 중 ${tally.total_ballots}명 투표` +
                  (tally.no_available_count > 0
                    ? `, 가능한 시간 없음 ${tally.no_available_count}명`
                    : "")
                : tallyError ?? "투표 현황을 불러오는 중"}
            </Text>
            <Text type="supporting">{formatCalculatedAt(candidateSet.created_at)} 계산</Text>
          </HStack>

          <ol className={`m-0 flex list-none flex-col gap-3 p-0 ${stale ? "opacity-60" : ""}`}>
            {candidateSet.candidates.map((c) => {
              const allAvailable = c.available_count >= total;
              const available = new Set(c.available_member_ids);
              const able = members.filter((m) => available.has(m.member_id));
              const missing = members.filter((m) => !available.has(m.member_id));
              const picked = selected.includes(c.candidate_id);
              const isWinner = c.candidate_id === winnerId;
              const isFocused = focusedId === c.candidate_id;
              const votes = votesById.get(c.candidate_id) ?? 0;
              const label = formatSlot(c.day_of_week, c.start_time, c.end_time);
              return (
                <li
                  key={c.candidate_id}
                  onMouseEnter={() => setFocusedId(c.candidate_id)}
                  onFocus={() => setFocusedId(c.candidate_id)}
                >
                  <Card
                    padding={5}
                    elevation={isFocused ? "med" : "none"}
                    variant={isFocused ? "default" : "muted"}
                  >
                    <VStack gap={4}>
                      <HStack hAlign="between" vAlign="start" gap={3} wrap="wrap">
                        <HStack gap={4} vAlign="center">
                          <span
                            aria-label={`${c.rank_no}순위`}
                            className="grid size-9 shrink-0 place-items-center rounded-full text-[15px] font-bold tabular-nums"
                            style={{
                              background: allAvailable
                                ? "var(--color-accent)"
                                : "var(--color-accent-muted)",
                              color: allAvailable
                                ? "var(--color-on-accent)"
                                : "var(--color-text-accent)",
                            }}
                          >
                            {c.rank_no}
                          </span>
                          <VStack gap={0.5}>
                            <HStack gap={2} vAlign="center" wrap="wrap">
                              <Text type="large" weight="bold" hasTabularNumbers>
                                {label}
                              </Text>
                              {isWinner && (
                                <Badge
                                  variant="green"
                                  label={voteStatus === "CLOSED" ? "최종 1위" : "현재 1위"}
                                />
                              )}
                              {!allAvailable && <Badge variant="neutral" label="차선책" />}
                            </HStack>
                            <Text type="supporting">
                              {allAvailable
                                ? `${total}명 모두 가능`
                                : `${total}명 중 ${c.available_count}명 가능, ${missing
                                    .map((m) => memberLabel(m, myUserId, emails))
                                    .join(", ")} 어려움`}
                            </Text>
                          </VStack>
                        </HStack>
                        {canVote && (
                          <div className="teum-toggle">
                            <ToggleButton
                              label="이 시간 좋아요"
                              size="sm"
                              icon={<Icon icon={HandThumbUpIcon} />}
                              isPressed={picked}
                              isDisabled={submitting}
                              onPressedChange={(pressed) => toggle(c.candidate_id, pressed)}
                            />
                          </div>
                        )}
                      </HStack>

                      <HStack gap={4} vAlign="center" wrap="wrap">
                        <AvatarGroup size="sm">
                          {able.map((m) => (
                            <Avatar key={m.member_id} name={memberLabel(m, myUserId, emails)} />
                          ))}
                        </AvatarGroup>
                        <div className="min-w-[120px] flex-1">
                          <ProgressBar
                            label={`${label} 득표`}
                            isLabelHidden
                            value={votes}
                            max={Math.max(total, 1)}
                          />
                        </div>
                        <Text type="label" hasTabularNumbers>
                          {tally ? `${votes}표` : "집계 중"}
                        </Text>
                        {canConfirm && (
                          <Button
                            label="이 시간으로 확정"
                            variant={isWinner ? "primary" : "secondary"}
                            size="sm"
                            isLoading={confirmingId === c.candidate_id}
                            isDisabled={confirmingId !== null && confirmingId !== c.candidate_id}
                            onClick={() => handleConfirm(c)}
                          />
                        )}
                      </HStack>
                    </VStack>
                  </Card>
                </li>
              );
            })}
          </ol>

          {canVote ? (
            <Card padding={4}>
              <VStack gap={3}>
                <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
                  <div className="teum-toggle">
                    <ToggleButton
                      label="가능한 시간이 없어요"
                      size="sm"
                      isPressed={noAvailable}
                      isDisabled={submitting}
                      onPressedChange={toggleNoAvailable}
                    />
                  </div>
                  <HStack gap={2}>
                    {isAdmin && (
                      <Button label="투표 마감" variant="ghost" isLoading={closing} onClick={handleClose} />
                    )}
                    <Button
                      label={
                        noAvailable
                          ? "투표하기"
                          : selected.length > 0
                            ? `${selected.length}개 시간에 투표하기`
                            : "투표하기"
                      }
                      variant="primary"
                      isLoading={submitting}
                      isDisabled={!noAvailable && selected.length === 0}
                      onClick={handleVote}
                    />
                  </HStack>
                </HStack>
                <Text type="supporting">
                  좋은 시간을 여러 개 고를 수 있어요. 다시 투표하면 이전 투표가 바뀌어요.
                </Text>
              </VStack>
            </Card>
          ) : (
            <Text type="supporting">
              {voteStatus === "CLOSED"
                ? "마감된 투표예요."
                : "이전 기준의 추천이라 투표할 수 없어요."}
            </Text>
          )}
          {voteError && <Banner status="error" title={voteError} />}
          <Text type="supporting">시간표를 등록하지 않은 팀원은 참석 가능 인원에서 빠져요.</Text>
        </VStack>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card padding={5}>
            <VStack gap={4}>
              <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
                <Heading level={3}>한 주에서 보기</Heading>
                {focused && (
                  <Text type="label" color="accent" hasTabularNumbers>
                    {formatSlot(focused.day_of_week, focused.start_time, focused.end_time)}
                  </Text>
                )}
              </HStack>
              <WeekMap
                candidates={candidateSet.candidates}
                searchStart={searchStart}
                searchEnd={searchEnd}
                totalMembers={total}
                focusedId={focusedId}
                onFocus={setFocusedId}
              />
              <HStack gap={4} wrap="wrap">
                <HStack gap={2} vAlign="center">
                  <i aria-hidden="true" className="block size-3 rounded-[4px] bg-[var(--color-accent)]" />
                  <Text type="supporting">모두 가능</Text>
                </HStack>
                <HStack gap={2} vAlign="center">
                  <i
                    aria-hidden="true"
                    className="block size-3 rounded-[4px]"
                    style={{ background: "color-mix(in srgb, var(--color-accent) 30%, #fff)" }}
                  />
                  <Text type="supporting">일부만 가능</Text>
                </HStack>
              </HStack>
            </VStack>
          </Card>
        </div>
      </div>
      {dialog}
    </VStack>
  );
}
