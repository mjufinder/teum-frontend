"use client";

import { Fragment, type ReactNode, type RefObject } from "react";

import { DAY_LABELS, SLOT_COUNT, index, slotLabel } from "@/lib/timetable";

const SLOTS = Array.from({ length: SLOT_COUNT }, (_, s) => s);

export interface WeeklyCellContext {
  day: number;
  slot: number;
  cell: number;
  /** 모임 상세 히트맵과 통일된 기본 셀 테두리/높이 클래스 */
  baseCellClass: string;
}

interface WeeklySlotGridProps {
  /** 그리드 상단에 표시되는 인스펙터/상태 바 */
  inspector?: ReactNode;
  /** 각 셀을 렌더링하는 렌더 프롭 */
  renderCell: (ctx: WeeklyCellContext) => ReactNode;
  /** 그리드 내부에 추가할 오버레이 (예: 선택 말풍선 툴팁) */
  overlay?: ReactNode;
  gridRef?: RefObject<HTMLDivElement | null>;
  scrollContainerClassName?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: () => void;
  onPointerCancel?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * 모임 히트맵과 내 시간표 편집기가 공유하는 7×26 주간 시간표 그리드 셸.
 */
export default function WeeklySlotGrid({
  inspector,
  renderCell,
  overlay,
  gridRef,
  scrollContainerClassName = "",
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onMouseEnter,
  onMouseLeave,
}: WeeklySlotGridProps) {
  return (
    <div className="flex flex-col gap-3">
      {inspector && (
        <div className="flex min-h-[2.25rem] flex-wrap items-center justify-between gap-2 rounded-[8px] border border-ink-line bg-ink-1/50 px-3 py-1.5 text-xs">
          {inspector}
        </div>
      )}

      <div className={`overflow-x-auto ${scrollContainerClassName}`}>
        <div
          ref={gridRef}
          className="relative grid min-w-[26rem] touch-none select-none grid-cols-[2.75rem_repeat(7,minmax(0,1fr))]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div />
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="pb-1.5 text-center text-xs font-bold text-ink-text-2"
            >
              {label}
            </div>
          ))}

          {SLOTS.map((slot) => (
            <Fragment key={slot}>
              <div className="h-5 pr-2 text-right text-[10px] leading-none text-ink-text-weak tabular-nums">
                {slot % 2 === 0 && slotLabel(slot)}
              </div>
              {DAY_LABELS.map((_, day) => {
                const cell = index(day, slot);
                const baseCellClass = `relative h-5 border-t border-l border-ink-line/70 ${
                  slot % 2 === 1 ? "border-t-ink-line/30" : ""
                } ${day === DAY_LABELS.length - 1 ? "border-r" : ""} ${
                  slot === SLOT_COUNT - 1 ? "border-b" : ""
                }`;
                return renderCell({ day, slot, cell, baseCellClass });
              })}
            </Fragment>
          ))}

          {overlay}
        </div>
      </div>
    </div>
  );
}
