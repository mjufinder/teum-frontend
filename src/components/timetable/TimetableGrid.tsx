"use client";

import { Fragment, useRef } from "react";

import {
  DAY_LABELS,
  SLOT_COUNT,
  index,
  slotLabel,
  slotState,
} from "@/lib/timetable";
import type { SlotState, TimetableBits } from "@/types/timetable";

const slots = Array.from({ length: SLOT_COUNT }, (_, slot) => slot);

const cellColors: Record<SlotState, string> = {
  class: "bg-brand",
  manual: "bg-amber-300",
  free: "bg-surface",
};

const legend: { state: SlotState; label: string }[] = [
  { state: "class", label: "수업" },
  { state: "manual", label: "개인 일정" },
  { state: "free", label: "가능" },
];

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 text-xs text-muted">
        {legend.map((item) => (
          <span key={item.state} className="flex items-center gap-1.5">
            <span
              className={`h-3 w-3 rounded-sm border border-line ${cellColors[item.state]}`}
            />
            {item.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <div
          className="grid select-none grid-cols-[3rem_repeat(7,minmax(2.5rem,1fr))]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPainting}
          onPointerCancel={stopPainting}
        >
          <div />
          {DAY_LABELS.map((label) => (
            <div key={label} className="py-1.5 text-center text-xs font-medium">
              {label}
            </div>
          ))}

          {slots.map((slot) => (
            <Fragment key={slot}>
              <div className="h-6 pr-1.5 text-right text-xs leading-6 text-muted">
                {slot % 2 === 0 && slotLabel(slot)}
              </div>
              {DAY_LABELS.map((_, day) => {
                const cell = index(day, slot);
                return (
                  <div
                    key={cell}
                    data-cell={cell}
                    className={`h-6 border-l border-t border-line ${
                      slot % 2 === 1 ? "border-t-zinc-100" : ""
                    } ${cellColors[slotState(bits, cell)]} ${
                      onPaint ? "cursor-pointer touch-none" : ""
                    }`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
