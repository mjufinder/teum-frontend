import Link from "next/link";

import { memberLabel } from "@/components/meeting/MemberList";
import { toHHMM } from "@/lib/meetings";
import { DAY_LABELS } from "@/lib/timetable";
import type { CandidateSet } from "@/types/candidate";
import type { Member } from "@/types/meeting";

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

// 팀원 추가 시 서버가 자동 계산한 추천 시간 Top 3 (MATCH)
export default function CandidateList({
  meetingId,
  candidateSet,
  error,
  onRetry,
  needsRecalc,
  isAdmin,
  members,
  myUserId,
  emails,
}: CandidateListProps) {
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

  const memberById = new Map(members.map((m) => [m.member_id, m]));
  const stale = needsRecalc || candidateSet.vote_status === "DISCARDED";
  const empty =
    candidateSet.result_status === "NO_CANDIDATE" || candidateSet.candidates.length === 0;

  return (
    <section className="flex flex-col gap-3">
      {header}

      {stale && (
        <Notice tone="warning">
          모임 조건이나 구성원이 바뀌어 아래 추천은 이전 기준이에요. 팀원을 새로 추가하면 다시
          계산돼요.
        </Notice>
      )}

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
        <ol className={`flex flex-col gap-3 ${stale ? "opacity-60" : ""}`}>
          {candidateSet.candidates.map((c) => {
            const total = members.length;
            const allAvailable = c.available_count >= total;
            const available = new Set(c.available_member_ids);
            const missing = members.filter((m) => !available.has(m.member_id));
            const ratio = total > 0 ? Math.min(c.available_count / total, 1) : 0;
            return (
              <li key={c.candidate_id} className="card flex flex-col gap-3 !p-5">
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
                  <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-[-0.01em]">
                      {DAY_LABELS[c.day_of_week]}요일{" "}
                      <span className="tabular-nums">
                        {toHHMM(c.start_time)} ~ {toHHMM(c.end_time)}
                      </span>
                    </span>
                  </div>
                  <span
                    className={`badge ml-auto ${allAvailable ? "badge-brand" : "badge-accent"}`}
                  >
                    {allAvailable ? "전원 가능" : "차선책"}
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
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${ratio * 100}%` }}
                    />
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
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-muted">
        시간표를 등록하지 않은 팀원은 참석 가능 인원에서 빠져요.
      </p>
    </section>
  );
}
