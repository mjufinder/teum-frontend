"use client";

import { toHHMM, toMinutes } from "@/lib/meetings";
import { DAY_LABELS } from "@/lib/timetable";
import type { Candidate } from "@/types/candidate";

const ROW_HEIGHT = 14;

interface WeekMapProps {
  candidates: Candidate[];
  // 탐색 시간대 "HH:MM(:SS)". 이 범위만 그린다.
  searchStart: string;
  searchEnd: string;
  totalMembers: number;
  focusedId: number | null;
  onFocus: (candidateId: number) => void;
}

// 추천 시간이 한 주의 어디에 있는지 보여 주는 지도.
// 팀원 전체 시간표는 서버가 주지 않으므로 추천 구간만 표시한다.
export default function WeekMap({
  candidates,
  searchStart,
  searchEnd,
  totalMembers,
  focusedId,
  onFocus,
}: WeekMapProps) {
  const windowStart = toMinutes(searchStart);
  const windowEnd = Math.max(toMinutes(searchEnd), windowStart + 60);
  const rows = Math.ceil((windowEnd - windowStart) / 30);
  const hourMarks = Array.from({ length: rows }, (_, row) => windowStart + row * 30).filter(
    (minutes) => minutes % 60 === 0
  );

  return (
    <div className="select-none">
      <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-x-1">
        <span />
        {DAY_LABELS.map((label) => (
          <span
            key={label}
            className="pb-2 text-center text-[13px] font-medium text-[var(--color-text-secondary)]"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-x-1">
        <div className="relative" style={{ height: rows * ROW_HEIGHT }}>
          {hourMarks.map((minutes) => (
            <span
              key={minutes}
              className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-[var(--color-text-secondary)]"
              style={{ top: ((minutes - windowStart) / 30) * ROW_HEIGHT }}
            >
              {String(Math.floor(minutes / 60)).padStart(2, "0")}
            </span>
          ))}
        </div>
        {DAY_LABELS.map((dayLabel, day) => (
          <div
            key={dayLabel}
            className="relative rounded-[8px] bg-[var(--teum-slot-free)]"
            style={{
              height: rows * ROW_HEIGHT,
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${ROW_HEIGHT * 2 - 1}px, #fff ${ROW_HEIGHT * 2 - 1}px ${ROW_HEIGHT * 2}px)`,
            }}
          >
            {candidates
              .filter((c) => c.day_of_week === day)
              .map((c) => {
                const top = ((toMinutes(c.start_time) - windowStart) / 30) * ROW_HEIGHT;
                const height = ((toMinutes(c.end_time) - toMinutes(c.start_time)) / 30) * ROW_HEIGHT;
                const all = c.available_count >= totalMembers;
                const focused = focusedId === c.candidate_id;
                return (
                  <button
                    key={c.candidate_id}
                    type="button"
                    aria-label={`${c.rank_no}순위 ${dayLabel}요일 ${toHHMM(c.start_time)}~${toHHMM(c.end_time)}`}
                    onMouseEnter={() => onFocus(c.candidate_id)}
                    onFocus={() => onFocus(c.candidate_id)}
                    onClick={() => onFocus(c.candidate_id)}
                    style={{
                      top,
                      height: Math.max(height, ROW_HEIGHT),
                      background: all
                        ? "var(--color-accent)"
                        : "color-mix(in srgb, var(--color-accent) 30%, #fff)",
                      color: all ? "var(--color-on-accent)" : "var(--color-text-accent)",
                      boxShadow: focused ? "0 0 0 2px #fff, 0 0 0 4.5px #0b2e1c" : "none",
                    }}
                    className={`absolute inset-x-0 grid cursor-pointer place-items-center rounded-[8px] border-0 p-0 text-[13px] font-bold tabular-nums transition-[box-shadow,transform] duration-200 motion-reduce:transition-none focus-visible:outline-none ${
                      focused ? "z-10" : ""
                    }`}
                  >
                    {c.rank_no}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
