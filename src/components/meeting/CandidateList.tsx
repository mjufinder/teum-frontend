"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { memberLabel } from "@/components/meeting/MemberList";
import { ApiError } from "@/lib/api";
import { toHHMM } from "@/lib/meetings";
import { DAY_LABELS } from "@/lib/timetable";
import { closeVote, getTally, submitVote } from "@/lib/votes";
import type { CandidateSet } from "@/types/candidate";
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
    <div
      className={`rounded-[14px] px-4 py-3 text-sm ${
        tone === "warning"
          ? "border-[1.5px] border-accent/60 bg-accent-soft text-accent-strong"
          : "border border-line bg-sunken text-muted"
      }`}
    >
      {children}
    </div>
  );
}

// 팀원 추가 시 서버가 자동 계산한 추천 시간 Top 3 (MATCH) + 선호 투표·집계·마감 (VOTE-01, 02)
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
        <div className="card flex flex-col items-start gap-3">
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
        <div className="card flex flex-col items-start gap-3">
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
  const memberById = new Map(members.map((m) => [m.member_id, m]));
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

  return (
    <div className="flex flex-col gap-3">
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

      <ol className={`flex flex-col gap-3 ${stale ? "opacity-60" : ""}`}>
        {candidateSet.candidates.map((c) => {
          const allAvailable = c.available_count >= total;
          const available = new Set(c.available_member_ids);
          const missing = members.filter((m) => !available.has(m.member_id));
          const ratio = total > 0 ? Math.min(c.available_count / total, 1) : 0;
          const picked = selected.includes(c.candidate_id);
          const isWinner = c.candidate_id === winnerId;
          return (
            <li
              key={c.candidate_id}
              className={`card flex flex-col gap-3 !p-5 ${
                picked ? "!border-brand-strong ring-2 ring-brand/30" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    c.rank_no === 1
                      ? "bg-brand-strong text-surface"
                      : "bg-brand-soft text-brand-strong"
                  }`}
                  aria-label={`${c.rank_no}순위`}
                >
                  {c.rank_no}
                </span>
                <span className="text-lg font-bold tracking-[-0.01em] tabular-nums">
                  {formatSlot(c.day_of_week, c.start_time, c.end_time)}
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-1.5">
                  {isWinner && (
                    <span className="badge bg-brand-strong text-surface">
                      {voteStatus === "CLOSED" ? "최종 1위" : "현재 1위"}
                    </span>
                  )}
                  <span className={`badge ${allAvailable ? "badge-brand" : "badge-accent"}`}>
                    {allAvailable ? "전원 가능" : "차선책"}
                  </span>
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">참석 가능</span>
                  <span className="font-semibold tabular-nums">
                    {total}명 중 {c.available_count}명
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-sunken"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={c.available_count}
                >
                  <div className="h-full rounded-full bg-brand" style={{ width: `${ratio * 100}%` }} />
                </div>
              </div>

              <p className="text-sm text-muted">
                가능:{" "}
                {c.available_member_ids
                  .map((id) => {
                    const m = memberById.get(id);
                    return m ? memberLabel(m, myUserId, emails) : "이전 구성원";
                  })
                  .join(", ")}
                {missing.length > 0 && (
                  <>
                    {" · "}
                    <span className="text-accent-strong">
                      어려움: {missing.map((m) => memberLabel(m, myUserId, emails)).join(", ")}
                    </span>
                  </>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <span className="text-sm font-semibold tabular-nums">
                  {tally ? `${votesById.get(c.candidate_id) ?? 0}표` : "-표"}
                </span>
                {canVote && (
                  <button
                    type="button"
                    aria-pressed={picked}
                    onClick={() => toggle(c.candidate_id)}
                    disabled={submitting}
                    className="chip ml-auto min-h-9 py-1.5"
                  >
                    {picked ? "✓ 이 시간 좋아요" : "이 시간 좋아요"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="card flex flex-col gap-3 !p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold">투표 현황</span>
          <span className="text-muted tabular-nums">
            {tally
              ? `${tally.total_ballots}명 투표 · 가능한 시간 없음 ${tally.no_available_count}명`
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
              <p className="text-sm font-semibold text-brand-strong">
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
