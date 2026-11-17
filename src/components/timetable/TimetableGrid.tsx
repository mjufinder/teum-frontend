"use client";

import { useRef } from "react";

import { DAY_LABELS, SLOT_COUNT, index, slotLabel, slotState } from "@/lib/timetable";
import type { SlotState, TimetableBits } from "@/types/timetable";

const ROW_HEIGHT = 22;
const slots = Array.from({ length: SLOT_COUNT }, (_, slot) => slot);

const cellClass: Record<SlotState, string> = {
  class: "teum-slot-class",
  manual: "teum-slot-manual",
  free: "teum-slot-free",
};

const stateLabel: Record<SlotState, string> = {
  class: "수업",
  manual: "개인 일정",
  free: "빈 시간",
};

function cellAt(x: number, y: number) {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
  return el ? Number(el.dataset.cell) : null;
}

// 빠르게 끌면 move 이벤트 사이의 칸을 건너뛰므로 두 칸 사이를 이어서 칠한다.
function cellsBetween(from: number, to: number) {
  const fromDay = Math.floor(from / SLOT_COUNT);
  const fromSlot = from % SLOT_COUNT;
  const dayGap = Math.floor(to / SLOT_COUNT) - fromDay;
  const slotGap = (to % SLOT_COUNT) - fromSlot;
  const steps = Math.max(Math.abs(dayGap), Math.abs(slotGap));
  return Array.from({ length: steps + 1 }, (_, i) =>
    index(
      fromDay + Math.round((dayGap * i) / steps),
      fromSlot + Math.round((slotGap * i) / steps)
    )
  );
}

interface TimetableGridProps {
  bits: TimetableBits;
  onPaint?: (cells: number[]) => void;
}

// 요일별 세로 띠로 그린 주간 시간표. onPaint 를 넘기면 누르거나 끌어서 칠할 수 있다.
export default function TimetableGrid({ bits, onPaint }: TimetableGridProps) {
  const lastCell = useRef<number | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!onPaint || e.button !== 0) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null) return;
    // 터치는 누른 칸에 포인터가 묶이므로 격자로 옮기고 좌표로 칸을 찾는다.
    e.currentTarget.setPointerCapture(e.pointerId);
    lastCell.current = cell;
    onPaint([cell]);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!onPaint || lastCell.current === null) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null || cell === lastCell.current) return;
    onPaint(cellsBetween(lastCell.current, cell));
    lastCell.current = cell;
  }

  function stopPainting() {
    lastCell.current = null;
  }

  // 키보드로는 칸에 초점을 두고 Enter·Space 로 칠한다.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!onPaint || (e.key !== "Enter" && e.key !== " ")) return;
    const cell = (e.target as HTMLElement).dataset.cell;
    if (cell === undefined) return;
    e.preventDefault();
    onPaint([Number(cell)]);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px] select-none">
        <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-x-1.5">
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
        <div
          className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-x-1.5"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPainting}
          onPointerCancel={stopPainting}
          onKeyDown={handleKeyDown}
        >
          <div className="flex flex-col">
            {slots.map((slot) => (
              <span
                key={slot}
                style={{ height: ROW_HEIGHT }}
                className="-translate-y-[7px] pr-2 text-right text-[11px] tabular-nums text-[var(--color-text-secondary)]"
              >
                {slot % 2 === 0 ? slotLabel(slot) : ""}
              </span>
            ))}
          </div>
          {DAY_LABELS.map((dayLabel, day) => (
            <div key={dayLabel} className="flex flex-col overflow-hidden rounded-[10px]">
              {slots.map((slot) => {
                const cell = index(day, slot);
                const state = slotState(bits, cell);
                return (
                  <div
                    key={cell}
                    data-cell={cell}
                    role={onPaint ? "button" : "img"}
                    tabIndex={onPaint ? 0 : undefined}
                    aria-label={`${dayLabel}요일 ${slotLabel(slot)} ${stateLabel[state]}`}
                    style={{ height: ROW_HEIGHT }}
                    className={`${cellClass[state]} transition-colors duration-150 ${
                      slot % 2 === 1 ? "border-b border-solid border-white" : ""
                    } ${
                      onPaint
                        ? "cursor-crosshair touch-none hover:brightness-95 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-outline-color)]"
                        : ""
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
