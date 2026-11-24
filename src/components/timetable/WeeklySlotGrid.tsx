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
  /** "scroll"이면 모바일 터치 스와이프 시 페이지 스크롤을 우선한다 */
  touchMode?: "paint" | "scroll";
  onDayClick?: (day: number) => void;
  onSlotRowClick?: (slot: number) => void;
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
  touchMode = "paint",
  onDayClick,
  onSlotRowClick,
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

      <div className={`overflow-x-auto p-[2px] ${scrollContainerClassName}`}>
        <div
          ref={gridRef}
          className={`relative grid min-w-[26rem] select-none grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] ${
            touchMode === "scroll" ? "touch-pan-x touch-pan-y" : "touch-none"
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div />
          {DAY_LABELS.map((label, day) =>
            onDayClick ? (
              <button
                key={label}
                type="button"
                onClick={() => onDayClick(day)}
                title={`${label}요일 전체 칠하기`}
                className="pb-1.5 text-center text-xs font-bold text-ink-text-2 transition-colors hover:text-neon"
              >
                {label}
              </button>
            ) : (
              <div
                key={label}
                className="pb-1.5 text-center text-xs font-bold text-ink-text-2"
              >
                {label}
              </div>
            )
          )}

          {SLOTS.map((slot) => (
            <Fragment key={slot}>
              {slot % 2 === 0 && onSlotRowClick ? (
                <button
                  type="button"
                  onClick={() => onSlotRowClick(slot)}
                  title={`${slotLabel(slot)} 시간대 전체 칠하기`}
                  className="h-5 pr-2 text-right text-[10px] leading-none text-ink-text-weak tabular-nums transition-colors hover:text-neon"
                >
                  {slotLabel(slot)}
                </button>
              ) : (
                <div className="h-5 pr-2 text-right text-[10px] leading-none text-ink-text-weak tabular-nums">
                  {slot % 2 === 0 && slotLabel(slot)}
                </div>
              )}
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
