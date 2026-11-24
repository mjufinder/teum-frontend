"use client";

import { Check, Megaphone, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import ConfirmDialog from "@/components/meeting/ConfirmDialog";
import ConfirmedSchedule from "@/components/meeting/ConfirmedSchedule";
import { memberLabel } from "@/components/meeting/MemberList";
import { ApiError } from "@/lib/api";
import { deleteCustomCandidate } from "@/lib/candidates";
import { confirmSchedule } from "@/lib/confirm";
import { toHHMM } from "@/lib/meetings";
import { DAY_LABELS } from "@/lib/timetable";
import { closeVote, getTally, submitVote } from "@/lib/votes";
import type { Candidate, CandidateSet } from "@/types/candidate";
import type { ConfirmedSlot, Member } from "@/types/meeting";
import type { Tally } from "@/types/vote";

interface CandidateListProps {
  meetingId: string;
  meetingName?: string;
  // undefined: 불러오는 중, null: 아직 계산된 후보 없음
  candidateSet: CandidateSet | null | undefined;
  error: string | null;
  onRetry: () => void;
  onCandidateChange?: (next: CandidateSet) => void;
  onHoverCandidate?: (candidate: Candidate | null) => void;
  focusedCandidateId?: number | null;
  selectedIds?: number[];
  onSelectedIdsChange?: (ids: number[]) => void;
  confirmedSchedule?: ConfirmedSlot | null;
  onConfirmed?: (slot: ConfirmedSlot) => void;
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
      className={`rounded-[8px] border px-3.5 py-2.5 text-xs leading-relaxed ${
        tone === "warning"
          ? "border-live/30 bg-live/5 font-medium text-ink-text"
          : "border-ink-line bg-ink-base text-ink-text-3"
      }`}
    >
      {children}
    </div>
  );
}

// 팀원 추가 시 서버가 자동 계산한 추천 시간 Top 3 (MATCH) + 투표·집계·마감·확정 (VOTE-01~03)
export default function CandidateList(props: CandidateListProps) {
  const { meetingId, candidateSet, error, onRetry, isAdmin } = props;

  const header = (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-sm font-bold text-ink-text">일정 후보</h2>
      {candidateSet && (
        <span className="text-xs text-ink-text-weak tabular-nums">
          {formatCalculatedAt(candidateSet.created_at)} 계산
        </span>
      )}
    </div>
  );

  if (error) {
    return (
      <section className="flex flex-col gap-3">
        {header}
        <div className="flex flex-col items-start gap-3 rounded-[12px] border border-ink-line bg-ink-1 p-5">
          <p className="text-sm text-live">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-8 items-center rounded-[8px] border border-ink-line-2 px-3 text-xs font-semibold text-ink-text hover:bg-ink-2"
          >
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
        <div className="divide-y divide-ink-line overflow-hidden rounded-[12px] border border-ink-line bg-ink-1">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-ink-1 px-5 py-4" />
          ))}
        </div>
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
            ? "오른쪽에서 팀원을 추가하면 모두의 시간표로 자동 계산돼요."
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
        <div className="flex flex-col items-start gap-3 rounded-[12px] border border-ink-line bg-ink-1 p-5">
          <p className="text-sm text-ink-text">
            지금 조건으로는 함께 비는 시간이 없어요.
            <br />
            <span className="text-xs text-ink-text-3">
              최소 회의시간을 줄이거나 탐색 시간대를 넓혀 보세요.
            </span>
          </p>
          {isAdmin && (
            <Link
              href={`/meetings/${meetingId}/edit`}
              className="inline-flex h-8 items-center rounded-[8px] border border-ink-line-2 px-3 text-xs font-semibold text-ink-text hover:bg-ink-2"
            >
              조건 수정하기
            </Link>
          )}
        </div>
      ) : (
        // 후보 묶음이 바뀌면 선택·집계 상태를 새로 시작한다
        <CandidateBoard key={candidateSet.set_id} {...props} candidateSet={candidateSet} />
      )}
      <p className="text-xs text-ink-text-weak">
        시간표를 등록하지 않은 팀원은 참석 가능 인원에서 빠져요.
      </p>
    </section>
  );
}

function CandidateBoard({
  meetingId,
  meetingName,
  candidateSet,
  onCandidateChange,
  onHoverCandidate,
  focusedCandidateId,
  selectedIds: controlledSelected,
  onSelectedIdsChange,
  confirmedSchedule = null,
  onConfirmed,
  needsRecalc,
  isAdmin,
  members,
  myUserId,
  emails,
}: CandidateListProps & { candidateSet: CandidateSet }) {
  const router = useRouter();
  const rowRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const setId = candidateSet.set_id;
  const [tally, setTally] = useState<Tally | null>(null);
  const [tallyError, setTallyError] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<number[]>([]);
  const selected = controlledSelected ?? internalSelected;
  const setSelected = onSelectedIdsChange ?? setInternalSelected;
  const [noAvailable, setNoAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [noticeCopied, setNoticeCopied] = useState(false);
  const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [postCloseWinner, setPostCloseWinner] = useState<Candidate | null>(null);
  // undefined: 이번 화면에서 확정 안 함, null: 이미 확정돼 있었음(시간은 알 수 없음)
  const [confirmedLabel, setConfirmedLabel] = useState<string | null | undefined>(undefined);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmWarning, setConfirmWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!focusedCandidateId) return;
    const el = rowRefs.current[focusedCandidateId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, [focusedCandidateId]);

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
  const isConfirmedMeeting = confirmedSchedule !== null || confirmedLabel !== undefined;
  const voteStatus = tally?.vote_status ?? candidateSet.vote_status;
  const stale = voteStatus === "DISCARDED" || (needsRecalc && voteStatus === "OPEN");
  const canVote = voteStatus === "OPEN" && !stale && !isConfirmedMeeting;
  const votesById = new Map(tally?.candidates.map((c) => [c.candidate_id, c.votes]) ?? []);
  const anyVotes = (tally?.total_ballots ?? 0) > 0;
  const winnerId = anyVotes ? tally?.winner_candidate_id ?? null : null;
  const winner = candidateSet.candidates.find((c) => c.candidate_id === winnerId);
  const total = members.length;
  const maxVotes = Math.max(1, ...(tally?.candidates.map((c) => c.votes) ?? [0]));

  function toggle(candidateId: number) {
    setVoted(false);
    setNoAvailable(false);
    const next = selected.includes(candidateId)
      ? selected.filter((id) => id !== candidateId)
      : [...selected, candidateId];
    setSelected(next);
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

  async function doConfirm(c: Candidate) {
    const label = formatSlot(c.day_of_week, c.start_time, c.end_time);
    setConfirmCandidate(null);
    setVoteError(null);
    setConfirmWarning(null);
    setConfirmingId(c.candidate_id);
    try {
      const result = await confirmSchedule(meetingId, c.candidate_id);
      if (result.confirmed) {
        setConfirmedLabel(label);
        onConfirmed?.({
          candidate_id: c.candidate_id,
          day_of_week: c.day_of_week,
          start_time: c.start_time,
          end_time: c.end_time,
          confirmed_at: new Date().toISOString(),
        });
        setTally(await getTally(meetingId, setId));
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

  async function doClose() {
    setConfirmCloseOpen(false);
    setVoteError(null);
    setClosing(true);
    try {
      const closed = await closeVote(meetingId, setId);
      setTally(closed);
      if (isAdmin && confirmedLabel === undefined && closed.winner_candidate_id) {
        const winCand = candidateSet.candidates.find(
          (c) => c.candidate_id === closed.winner_candidate_id
        );
        if (winCand) setPostCloseWinner(winCand);
      }
    } catch (e) {
      handleError(e, "투표를 마감하지 못했어요.");
    } finally {
      setClosing(false);
    }
  }

  async function handleCopyWinnerNotice() {
    if (!winner) return;
    const prefix = meetingName ? `[${meetingName}] ` : "";
    const slot = formatSlot(winner.day_of_week, winner.start_time, winner.end_time);
    const text = `${prefix}${voteStatus === "CLOSED" ? "최종 1위" : "현재 1위"} 후보: ${slot} (${winner.available_count}/${total}명 가능)`;
    try {
      await navigator.clipboard.writeText(text);
      setNoticeCopied(true);
      setTimeout(() => setNoticeCopied(false), 2000);
    } catch {
      setVoteError("공지 문구를 복사하지 못했어요.");
    }
  }

  async function handleDeleteCustom(c: Candidate) {
    setVoteError(null);
    setDeletingId(c.candidate_id);
    try {
      const updated = await deleteCustomCandidate(meetingId, c.candidate_id);
      setSelected(selected.filter((id) => id !== c.candidate_id));
      onCandidateChange?.(updated);
      setTally(await getTally(meetingId, setId));
    } catch (e) {
      handleError(e, "후보 시간을 삭제하지 못했어요.");
    } finally {
      setDeletingId(null);
    }
  }

  const canConfirm = isAdmin && !isConfirmedMeeting && !stale;
  const recommended = candidateSet.candidates.filter((c) => c.rank_no <= 3);
  const custom = candidateSet.candidates.filter((c) => c.rank_no > 3);

  function renderCandidateRow(c: Candidate, idx: number) {
    const allAvailable = c.available_count >= total;
    const available = new Set(c.available_member_ids);
    const missing = members.filter((m) => !available.has(m.member_id));
    const picked = selected.includes(c.candidate_id);
    const isWinner = c.candidate_id === winnerId;
    const isCustom = c.rank_no > 3;
    const displayNo = isCustom ? idx + 1 : c.rank_no;
    const votes = votesById.get(c.candidate_id) ?? 0;
    const ratio = tally ? Math.round((votes / maxVotes) * 100) : 0;

    return (
      <li
        key={c.candidate_id}
        ref={(el) => {
          rowRefs.current[c.candidate_id] = el;
        }}
        tabIndex={-1}
        onMouseEnter={() => onHoverCandidate?.(c)}
        onMouseLeave={() => onHoverCandidate?.(null)}
        className={`relative flex flex-col gap-2 px-4 py-3 transition-colors focus:bg-neon/[0.08] focus:ring-2 focus:ring-inset focus:ring-neon focus:outline-none ${
          picked
            ? "bg-neon/[0.06]"
            : isWinner
              ? "bg-gradient-to-r from-neon/[0.04] to-transparent"
              : "hover:bg-ink-2/60"
        }`}
      >
        {(picked || isWinner) && (
          <span
            aria-hidden
            className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-neon"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5">
            <span
              className={`text-xs font-bold tabular-nums ${
                (!isCustom && c.rank_no === 1) || isWinner ? "text-neon" : "text-ink-text-weak"
              }`}
              aria-label={isCustom ? `후보 ${displayNo}번` : `${displayNo}순위`}
            >
              {String(displayNo).padStart(2, "0")}
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold tracking-[-0.01em] text-ink-text tabular-nums">
                {formatSlot(c.day_of_week, c.start_time, c.end_time)}
              </span>
              {isWinner && (
                <span className="rounded border border-neon/40 bg-neon/10 px-1.5 py-0.5 text-[0.65rem] font-bold text-neon">
                  {voteStatus === "CLOSED" ? "최종 1위" : "1위"}
                </span>
              )}
              {!isCustom && !allAvailable && (
                <span className="rounded bg-ink-3 px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink-text-3">
                  차선책
                </span>
              )}
              <span className="text-xs text-ink-text-3">
                ·{" "}
                <span className="font-medium text-ink-text-2">
                  {allAvailable
                    ? `${total}명 모두 가능`
                    : `${total}명 중 ${c.available_count}명 가능`}
                </span>
                {missing.length > 0 && (
                  <span>
                    {" "}
                    (어려움: {missing.map((m) => memberLabel(m, myUserId, emails)).join(", ")})
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 참석 가능 인원 아바타 스택 */}
            <div className="flex items-center -space-x-1.5" aria-hidden>
              {members.map((m) => {
                const ok = available.has(m.member_id);
                return (
                  <span
                    key={m.member_id}
                    title={memberLabel(m, myUserId, emails)}
                    className={`grid size-5 place-items-center rounded-full ring-2 ring-ink-1 ${
                      ok ? "bg-neon/20 text-neon" : "bg-ink-2 text-ink-text-weak"
                    }`}
                  >
                    {ok ? <Check className="size-2.5" strokeWidth={2.5} /> : <X className="size-2.5" />}
                  </span>
                );
              })}
            </div>

            {isCustom && canVote && confirmedLabel === undefined && (
              <button
                type="button"
                aria-label="후보 시간 삭제"
                disabled={deletingId === c.candidate_id}
                onClick={() => handleDeleteCustom(c)}
                className="grid size-6 place-items-center rounded text-ink-text-weak transition-colors hover:bg-live/10 hover:text-live disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pl-6">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-3">
              <div
                className="h-full rounded-full bg-neon transition-all duration-300"
                style={{ width: `${tally ? ratio : 0}%` }}
              />
            </div>
            <span className="text-xs text-ink-text-3 tabular-nums">
              {tally ? `${votes}표` : "집계 중"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {canConfirm && (
              <button
                type="button"
                onClick={() => setConfirmCandidate(c)}
                disabled={confirmingId !== null}
                className="inline-flex h-7 items-center rounded-[7px] border border-ink-line-2 bg-ink-base px-2.5 text-xs font-semibold text-ink-text transition-colors hover:bg-ink-2 disabled:opacity-50"
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
                className={`inline-flex h-7 items-center gap-1 rounded-[7px] px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  picked
                    ? "bg-neon text-on-neon"
                    : "border border-ink-line-2 bg-ink-base text-ink-text-2 hover:border-ink-text-3 hover:text-ink-text"
                }`}
              >
                {picked && <Check className="size-3" strokeWidth={2.5} />}
                좋아요
              </button>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {confirmedLabel !== undefined && confirmedSchedule === null && (
        <ConfirmedSchedule
          meetingId={meetingId}
          meetingName={meetingName}
          slotLabel={confirmedLabel}
          isAdmin={isAdmin}
        />
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
              <strong className="text-ink-text">
                {formatSlot(winner.day_of_week, winner.start_time, winner.end_time)}
              </strong>
              이에요.
            </>
          )}
        </Notice>
      )}

      <div className="overflow-hidden rounded-[12px] border border-ink-line bg-ink-1">
        {custom.length > 0 && (
          <div>
            <div className="flex items-center justify-between bg-ink-2/90 px-4 py-2.5 text-xs font-bold text-ink-text">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-ink-text-2" />
                직접 추가한 후보 시간
              </span>
              <span className="rounded bg-ink-3 px-1.5 py-0.5 text-[11px] font-bold text-ink-text-2 tabular-nums">
                {custom.length}개
              </span>
            </div>
            <ol className={`divide-y divide-ink-line border-t border-ink-line ${stale ? "opacity-55" : ""}`}>
              {custom.map((c, idx) => renderCandidateRow(c, idx))}
            </ol>
          </div>
        )}

        {recommended.length > 0 && (
          <div className={custom.length > 0 ? "border-t border-ink-line" : ""}>
            <div className="flex items-center justify-between bg-neon/10 px-4 py-2.5 text-xs font-bold text-neon">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-neon" />
                추천 시간
              </span>
              <span className="rounded bg-neon/15 px-1.5 py-0.5 text-[11px] font-bold text-neon tabular-nums">
                Top {recommended.length}
              </span>
            </div>
            <ol className={`divide-y divide-ink-line border-t border-ink-line ${stale ? "opacity-55" : ""}`}>
              {recommended.map((c, idx) => renderCandidateRow(c, idx))}
            </ol>
          </div>
        )}

        {/* 하단 투표 바 */}
        <div className="flex flex-col gap-3 border-t border-ink-line bg-ink-base/60 px-5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-ink-text-2">투표 현황</span>
            <div className="flex flex-wrap items-center gap-2">
              {winner && (
                <button
                  type="button"
                  onClick={handleCopyWinnerNotice}
                  className="inline-flex h-6 items-center gap-1 rounded border border-ink-line-2 bg-ink-1 px-2 text-[11px] font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text"
                >
                  {noticeCopied ? (
                    <Check className="size-3 text-neon" />
                  ) : (
                    <Megaphone className="size-3 text-neon" />
                  )}
                  {noticeCopied ? "복사됨" : "1위 공지 복사"}
                </button>
              )}
              <span className="text-ink-text-3 tabular-nums">
                {tally
                  ? `${tally.total_ballots}명 투표 · 가능한 시간 없음 ${tally.no_available_count}명`
                  : tallyError ?? "불러오는 중..."}
              </span>
            </div>
          </div>

          {canVote ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={noAvailable}
                  onClick={toggleNoAvailable}
                  disabled={submitting}
                  className={`inline-flex h-8 items-center rounded-[8px] px-3 text-xs font-semibold transition-colors ${
                    noAvailable
                      ? "bg-live/15 text-live ring-1 ring-live/40"
                      : "border border-ink-line-2 bg-ink-1 text-ink-text-3 hover:text-ink-text"
                  }`}
                >
                  가능한 시간이 없어요
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfirmCloseOpen(true)}
                    disabled={closing}
                    className="inline-flex h-8 items-center rounded-[8px] border border-ink-line bg-transparent px-3 text-xs font-semibold text-ink-text-3 transition-colors hover:bg-ink-2 hover:text-ink-text disabled:opacity-50"
                  >
                    {closing ? "마감 중..." : "투표 마감"}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleVote}
                disabled={submitting || (!noAvailable && selected.length === 0)}
                className="inline-flex h-8 items-center justify-center rounded-[8px] bg-neon px-4 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "투표 중..." : "투표하기"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-ink-text-3">
              {isConfirmedMeeting
                ? "일정이 확정되어 투표가 종료되었어요."
                : voteStatus === "CLOSED"
                  ? "마감된 투표예요."
                  : "이전 기준의 추천이라 투표할 수 없어요."}
            </p>
          )}
          {voted && (
            <p className="text-xs font-semibold text-neon">
              투표했어요. 다시 고르고 투표하면 바뀌어요.
            </p>
          )}
          {voteError && <p className="text-xs text-live">{voteError}</p>}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCandidate !== null}
        title="이 시간으로 확정할까요?"
        description={
          confirmCandidate
            ? `${formatSlot(confirmCandidate.day_of_week, confirmCandidate.start_time, confirmCandidate.end_time)}으로 확정하기 전에 팀원 시간표 변경 여부를 다시 확인하고, 모임당 한 번만 확정할 수 있어요.`
            : ""
        }
        confirmLabel="확정하기"
        busy={confirmingId !== null}
        onConfirm={() => {
          if (confirmCandidate) doConfirm(confirmCandidate);
        }}
        onCancel={() => setConfirmCandidate(null)}
      />

      <ConfirmDialog
        open={confirmCloseOpen}
        title="투표를 마감할까요?"
        description="마감하면 더 이상 투표하거나 선택을 바꿀 수 없어요."
        confirmLabel="투표 마감"
        busy={closing}
        onConfirm={doClose}
        onCancel={() => setConfirmCloseOpen(false)}
      />

      <ConfirmDialog
        open={postCloseWinner !== null}
        title="최종 1위 시간으로 바로 확정할까요?"
        description={
          postCloseWinner
            ? `투표가 마감되었어요. 1위인 ${formatSlot(postCloseWinner.day_of_week, postCloseWinner.start_time, postCloseWinner.end_time)}으로 모임 일정을 바로 확정할 수 있어요.`
            : ""
        }
        confirmLabel="이 시간으로 확정"
        cancelLabel="나중에 하기"
        busy={confirmingId !== null}
        onConfirm={() => {
          if (postCloseWinner) {
            const target = postCloseWinner;
            setPostCloseWinner(null);
            doConfirm(target);
          }
        }}
        onCancel={() => setPostCloseWinner(null)}
      />
    </div>
  );
}
