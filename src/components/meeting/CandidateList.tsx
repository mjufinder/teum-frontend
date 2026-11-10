"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ConfirmedSchedule from "@/components/meeting/ConfirmedSchedule";
import { memberLabel } from "@/components/meeting/MemberList";
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

function Notice({
  tone,
  children,
}: {
  tone: "muted" | "warning";
  children: React.ReactNode;
}) {
  return (
    <div className={`notice ${tone === "warning" ? "font-bold" : "border-line text-muted"}`}>
      {children}
    </div>
  );
}

// 팀원 추가 시 서버가 자동 계산한 추천 시간 Top 3 (MATCH) + 투표·집계·마감·확정 (VOTE-01~03)
export default function CandidateList(props: CandidateListProps) {
  const { meetingId, candidateSet, error, onRetry, isAdmin } = props;

  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="section-title">추천 시간</h2>
      {candidateSet && (
        <span className="text-xs text-muted">
          {formatCalculatedAt(candidateSet.created_at)} 계산
        </span>
      )}
    </div>
  );

  if (error) {
    return (
      <section className="flex flex-col gap-3">
        {header}
        <div className="flex flex-col items-start gap-3 border-t-2 border-brand pt-4">
          <p className="text-sm text-danger">{error}</p>
          <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm">
            다시 불러오기
          </button>
        </div>
      </section>
    );
  }

  if (candidateSet === undefined) {
    return (
      <section className="flex flex-col gap-3">
        {header}
        <p className="text-sm text-muted">추천 시간을 불러오는 중...</p>
      </section>
    );
  }

  if (candidateSet === null) {
    return (
      <section className="flex flex-col gap-3">
        {header}
        <Notice tone="muted">
          아직 계산된 추천 시간이 없어요.{" "}
          {isAdmin
            ? "아래에서 팀원을 추가하면 모두의 시간표로 자동 계산돼요."
            : "관리자가 팀원을 추가하면 자동으로 계산돼요."}
        </Notice>
      </section>
    );
  }

  const empty =
    candidateSet.result_status === "NO_CANDIDATE" || candidateSet.candidates.length === 0;

  return (
    <section className="flex flex-col gap-3">
      {header}
      {empty ? (
        <div className="flex flex-col items-start gap-3 border-t-2 border-brand pt-4">
          <p className="text-sm">
            지금 조건으로는 함께 비는 시간이 없어요.
            <br />
            <span className="text-muted">
              최소 회의시간을 줄이거나 탐색 시간대를 넓혀 보세요.
            </span>
          </p>
          {isAdmin && (
            <Link href={`/meetings/${meetingId}/edit`} className="btn btn-secondary btn-sm">
              조건 수정하기
            </Link>
          )}
        </div>
      ) : (
        // 후보 묶음이 바뀌면 선택·집계 상태를 새로 시작한다
        <CandidateBoard key={candidateSet.set_id} {...props} candidateSet={candidateSet} />
      )}
      <p className="text-xs text-muted">
        시간표를 등록하지 않은 팀원은 참석 가능 인원에서 빠져요.
      </p>
    </section>
  );
}

function CandidateBoard({
  meetingId,
  candidateSet,
  needsRecalc,
  isAdmin,
  members,
  myUserId,
  emails,
}: CandidateListProps & { candidateSet: CandidateSet }) {
  const router = useRouter();
  const setId = candidateSet.set_id;
  const [tally, setTally] = useState<Tally | null>(null);
  const [tallyError, setTallyError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [noAvailable, setNoAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  // undefined: 이번 화면에서 확정 안 함, null: 이미 확정돼 있었음(시간은 알 수 없음)
  const [confirmedLabel, setConfirmedLabel] = useState<string | null | undefined>(undefined);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmWarning, setConfirmWarning] = useState<string | null>(null);

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

  function toggle(candidateId: number) {
    setVoted(false);
    setNoAvailable(false);
    setSelected((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  }

  function toggleNoAvailable() {
    setVoted(false);
    setSelected([]);
    setNoAvailable((prev) => !prev);
  }

  async function handleVote() {
    setVoteError(null);
    setSubmitting(true);
    try {
      await submitVote(meetingId, setId, {
        candidate_ids: noAvailable ? [] : selected,
        no_available: noAvailable,
      });
      setVoted(true);
      setTally(await getTally(meetingId, setId));
    } catch (e) {
      handleError(e, "투표하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(c: Candidate) {
    const label = formatSlot(c.day_of_week, c.start_time, c.end_time);
    if (
      !confirm(
        `${label}으로 확정할까요? 확정 직전에 팀원 시간표가 바뀌었는지 다시 확인하고, 모임당 한 번만 확정할 수 있어요.`
      )
    ) {
      return;
    }
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
    if (!confirm("투표를 마감할까요? 마감하면 더 이상 투표할 수 없어요.")) return;
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

  return (
    <div className="flex flex-col gap-3">
      {confirmedLabel !== undefined && (
        <ConfirmedSchedule meetingId={meetingId} slotLabel={confirmedLabel} isAdmin={isAdmin} />
      )}
      {confirmWarning && (
        <Notice tone="warning">
          {confirmWarning} 팀원을 새로 추가하면 다시 계산돼요.
        </Notice>
      )}
      {stale && (
        <Notice tone="warning">
          모임 조건이나 구성원이 바뀌어 아래 추천은 이전 기준이에요. 팀원을 새로 추가하면 다시
          계산돼요.
        </Notice>
      )}
      {voteStatus === "CLOSED" && (
        <Notice tone="muted">
          투표가 마감됐어요.
          {winner && (
            <>
              {" "}
              최종 1위는{" "}
              <strong className="text-foreground">
                {formatSlot(winner.day_of_week, winner.start_time, winner.end_time)}
              </strong>
              이에요.
            </>
          )}
        </Notice>
      )}

      <ol className={`border-t-2 border-brand ${stale ? "opacity-55" : ""}`}>
        {candidateSet.candidates.map((c) => {
          const allAvailable = c.available_count >= total;
          const available = new Set(c.available_member_ids);
          const missing = members.filter((m) => !available.has(m.member_id));
          const picked = selected.includes(c.candidate_id);
          const isWinner = c.candidate_id === winnerId;
          return (
            <li
              key={c.candidate_id}
              className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-line py-4 pr-1 transition-colors ${
                picked ? "bg-brand-soft" : ""
              }`}
            >
              <span
                className="pl-1 text-[1.625rem] leading-none font-bold text-brand"
                aria-label={`${c.rank_no}순위`}
              >
                {c.rank_no}
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[1.25rem] leading-tight font-bold tracking-[-0.01em]">
                    {formatSlot(c.day_of_week, c.start_time, c.end_time)}
                  </span>
                  {isWinner && (
                    <span className="badge badge-brand">
                      {voteStatus === "CLOSED" ? "최종 1위" : "현재 1위"}
                    </span>
                  )}
                  {!allAvailable && <span className="badge badge-accent">차선책</span>}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="flex gap-1" aria-hidden>
                    {members.map((m) => (
                      <span
                        key={m.member_id}
                        title={memberLabel(m, myUserId, emails)}
                        className={`size-3.5 ${
                          available.has(m.member_id)
                            ? "bg-brand"
                            : "border-[1.5px] border-line-strong bg-white"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="font-bold">
                    {allAvailable
                      ? `${total}명 모두 가능`
                      : `${total}명 중 ${c.available_count}명 가능`}
                  </span>
                  {missing.length > 0 && (
                    <span className="text-muted">
                      어려움: {missing.map((m) => memberLabel(m, myUserId, emails)).join(", ")}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted">
                    {tally ? `${votesById.get(c.candidate_id) ?? 0}표` : "집계 중"}
                  </span>
                  {canConfirm && (
                    <button
                      type="button"
                      onClick={() => handleConfirm(c)}
                      disabled={confirmingId !== null}
                      className="btn btn-secondary btn-sm ml-auto"
                    >
                      {confirmingId === c.candidate_id ? "확정 중..." : "이 시간으로 확정"}
                    </button>
                  )}
                  {canVote && (
                    <button
                      type="button"
                      aria-pressed={picked}
                      onClick={() => toggle(c.candidate_id)}
                      disabled={submitting}
                      className={`chip min-h-9 py-1.5 ${canConfirm ? "" : "ml-auto"}`}
                    >
                      이 시간 좋아요
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-bold">투표 현황</span>
          <span className="text-muted tabular-nums">
            {tally
              ? `${tally.total_ballots}명 투표, 가능한 시간 없음 ${tally.no_available_count}명`
              : tallyError ?? "불러오는 중..."}
          </span>
        </div>

        {canVote ? (
          <>
            <p className="text-xs text-muted">
              좋은 시간을 여러 개 고를 수 있어요. 다시 투표하면 이전 투표가 바뀌어요.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={noAvailable}
                onClick={toggleNoAvailable}
                disabled={submitting}
                className="chip"
              >
                가능한 시간이 없어요
              </button>
              <button
                type="button"
                onClick={handleVote}
                disabled={submitting || (!noAvailable && selected.length === 0)}
                className="btn btn-primary ml-auto"
              >
                {submitting ? "투표 중..." : "투표하기"}
              </button>
            </div>
            {voted && (
              <p className="text-sm font-bold text-brand-strong">
                투표했어요. 다시 고르고 투표하면 바뀌어요.
              </p>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={handleClose}
                disabled={closing}
                className="btn btn-secondary btn-sm self-start"
              >
                {closing ? "마감 중..." : "투표 마감"}
              </button>
            )}
          </>
        ) : (
          <p className="text-xs text-muted">
            {voteStatus === "CLOSED"
              ? "마감된 투표예요."
              : "이전 기준의 추천이라 투표할 수 없어요."}
          </p>
        )}
        {voteError && <p className="text-sm text-danger">{voteError}</p>}
      </div>
    </div>
  );
}
