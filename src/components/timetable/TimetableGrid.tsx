"use client";

import { useRef, useState } from "react";

import WeeklySlotGrid from "@/components/timetable/WeeklySlotGrid";
import { DAY_LABELS, SLOT_COUNT, slotLabel, slotState } from "@/lib/timetable";
import type { SlotState, TimetableBits } from "@/types/timetable";

const cellTones: Record<SlotState, string> = {
  class: "bg-emerald-600/80 dark:bg-neon/65",
  manual: "bg-emerald-500/35 dark:bg-emerald-400/30",
  free: "bg-transparent",
};

const legend: { state: SlotState; label: string; swatch: string }[] = [
  { state: "class", label: "수업", swatch: "bg-emerald-600/80 dark:bg-neon/65" },
  { state: "manual", label: "개인 일정", swatch: "bg-emerald-500/35 dark:bg-emerald-400/30" },
  { state: "free", label: "공강(가능)", swatch: "border border-ink-line bg-transparent" },
];

const stateText: Record<SlotState, string> = {
  class: "수업",
  manual: "개인 일정",
  free: "공강",
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
    (fromDay + Math.round((dayGap * i) / steps)) * SLOT_COUNT +
    (fromSlot + Math.round((slotGap * i) / steps))
  );
}

interface TimetableGridProps {
  bits: TimetableBits;
  onPaint?: (cells: number[]) => void;
}

export default function TimetableGrid({ bits, onPaint }: TimetableGridProps) {
  const lastCell = useRef<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!onPaint || e.button !== 0) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null) return;
    // 터치는 누른 칸에 포인터가 묶이므로 격자로 옮기고 좌표로 칸을 찾는다.
    e.currentTarget.setPointerCapture(e.pointerId);
    lastCell.current = cell;
    setHoveredCell(cell);
    onPaint([cell]);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const cell = cellAt(e.clientX, e.clientY);
    if (cell !== null) setHoveredCell(cell);
    if (!onPaint || lastCell.current === null) return;
    if (cell === null || cell === lastCell.current) return;
    onPaint(cellsBetween(lastCell.current, cell));
    lastCell.current = cell;
  }

  function stopPainting() {
    lastCell.current = null;
  }

  const hoveredInfo =
    hoveredCell !== null
      ? {
          day: DAY_LABELS[Math.floor(hoveredCell / SLOT_COUNT)],
          start: slotLabel(hoveredCell % SLOT_COUNT),
          end: slotLabel((hoveredCell % SLOT_COUNT) + 1),
          state: stateText[slotState(bits, hoveredCell)],
        }
      : null;

  return (
    <div className="flex flex-col gap-3">
      {/* 모임 히트맵과 동일한 범례 행 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-text-3">
          {legend.map((item) => (
            <span key={item.state} className="inline-flex items-center gap-1.5">
              <span className={`size-3 rounded-[3px] ${item.swatch}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <WeeklySlotGrid
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPainting}
        onPointerCancel={stopPainting}
        onMouseLeave={() => setHoveredCell(null)}
        inspector={
          hoveredInfo ? (
            <>
              <span className="font-bold text-ink-text tabular-nums">
                {hoveredInfo.day}요일 {hoveredInfo.start} ~ {hoveredInfo.end}
              </span>
              <span className="font-semibold text-neon">{hoveredInfo.state}</span>
            </>
          ) : (
            <span className="text-ink-text-3">
              칸을 누르거나 드래그하면 수업·개인 일정을 바로 칠할 수 있어요.
            </span>
          )
        }
        renderCell={({ cell, baseCellClass }) => {
          const state = slotState(bits, cell);
          const isHovered = hoveredCell === cell;
          return (
            <div
              key={cell}
              data-cell={cell}
              className={`${baseCellClass} ${cellTones[state]} transition-colors ${
                onPaint ? "cursor-crosshair" : ""
              } ${isHovered ? "z-10 ring-1 ring-ink-text" : ""}`}
            />
          );
        }}
      />
    </div>
  );
}
