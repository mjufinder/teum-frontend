"use client";

import { Hand, Paintbrush } from "lucide-react";
import { useRef, useState } from "react";

import WeeklySlotGrid from "@/components/timetable/WeeklySlotGrid";
import { DAY_LABELS, SLOT_COUNT, index, slotLabel, slotState } from "@/lib/timetable";
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
  const [touchMode, setTouchMode] = useState<"paint" | "scroll">("paint");

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!onPaint || e.button !== 0) return;
    if (touchMode === "scroll" && e.pointerType === "touch") return;
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
    if (touchMode === "scroll" && e.pointerType === "touch") return;
    if (cell === null || cell === lastCell.current) return;
    onPaint(cellsBetween(lastCell.current, cell));
    lastCell.current = cell;
  }

  function stopPainting() {
    lastCell.current = null;
  }

  function handleDayClick(day: number) {
    if (!onPaint) return;
    const cells = Array.from({ length: SLOT_COUNT }, (_, s) => index(day, s));
    onPaint(cells);
  }

  function handleSlotRowClick(slot: number) {
    if (!onPaint) return;
    const cells: number[] = [];
    for (let day = 0; day < DAY_LABELS.length; day += 1) {
      cells.push(index(day, slot));
      if (slot + 1 < SLOT_COUNT) {
        cells.push(index(day, slot + 1));
      }
    }
    onPaint(cells);
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
    <div className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 p-4">
      {/* 범례 행 + 모바일 터치 스크롤/칠하기 전환 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-text-3">
          {legend.map((item) => (
            <span key={item.state} className="inline-flex items-center gap-1.5">
              <span className={`size-3 rounded-[3px] ${item.swatch}`} />
              {item.label}
            </span>
          ))}
        </div>

        {onPaint && (
          <button
            type="button"
            onClick={() => setTouchMode((m) => (m === "paint" ? "scroll" : "paint"))}
            aria-pressed={touchMode === "scroll"}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors md:hidden ${
              touchMode === "scroll"
                ? "border-neon/50 bg-neon/12 text-neon"
                : "border-ink-line-2 bg-ink-1 text-ink-text-2"
            }`}
          >
            {touchMode === "scroll" ? (
              <>
                <Hand className="size-3" />
                스크롤 모드
              </>
            ) : (
              <>
                <Paintbrush className="size-3 text-neon" />
                칠하기 모드
              </>
            )}
          </button>
        )}
      </div>

      <WeeklySlotGrid
        touchMode={touchMode}
        onDayClick={onPaint ? handleDayClick : undefined}
        onSlotRowClick={onPaint ? handleSlotRowClick : undefined}
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
              {touchMode === "scroll"
                ? "스크롤 모드예요. 요일·시간 라벨을 눌러 일괄 선택하거나 칠하기 모드로 전환하세요."
                : "칸을 드래그하거나 요일·시간 라벨을 눌러 한 번에 칠할 수 있어요."}
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
