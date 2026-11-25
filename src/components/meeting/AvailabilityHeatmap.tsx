"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { memberLabel } from "@/components/meeting/MemberList";
import WeeklySlotGrid from "@/components/timetable/WeeklySlotGrid";
import { toHHMM, toMinutes } from "@/lib/meetings";
import { DAY_LABELS, SLOT_COUNT, index, slotLabel } from "@/lib/timetable";
import type { Candidate, MeetingAvailability } from "@/types/candidate";
import type { ConfirmedSlot, Member } from "@/types/meeting";

interface AvailabilityHeatmapProps {
  availability: MeetingAvailability | null | undefined;
  error: string | null;
  onRetry: () => void;
  onAddCandidate?: (input: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  }) => Promise<void>;
  onSelectCandidate?: (candidateId: number) => void;
  selectedCandidateIds?: number[];
  confirmedSlot?: ConfirmedSlot | null;
  candidates?: Candidate[];
  highlightedCandidate?: Candidate | null;
  members: Member[];
  myUserId: number;
  emails: Record<number, string>;
  searchStartTime: string;
  searchEndTime: string;
  minDurationMin?: number;
}

interface SlotSelection {
  day: number;
  startSlot: number;
  endSlot: number; // inclusive
}

interface BubblePos {
  top: number;
  left: number;
  align: "left" | "center" | "right";
}

function slotTone(count: number, total: number): string {
  if (total <= 0 || count <= 0) return "bg-transparent";
  const ratio = count / total;
  if (ratio >= 1) return "bg-emerald-600/80 dark:bg-neon/65";
  if (ratio >= 0.75) return "bg-emerald-600/65 dark:bg-emerald-400/60";
  if (ratio >= 0.5) return "bg-emerald-500/50 dark:bg-emerald-400/45";
  if (ratio >= 0.25) return "bg-emerald-500/35 dark:bg-emerald-400/32";
  return "bg-emerald-500/20 dark:bg-emerald-400/20";
}

function formatSlotRange(slot: number) {
  return `${slotLabel(slot)} ~ ${slotLabel(slot + 1)}`;
}

function cellFromPoint(x: number, y: number): { day: number; slot: number } | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-hcell]");
  if (!el || !el.dataset.hcell) return null;
  const cell = Number(el.dataset.hcell);
  return { day: Math.floor(cell / SLOT_COUNT), slot: cell % SLOT_COUNT };
}

function blockShadow(isTop: boolean, isBottom: boolean, color: string): string {
  const shadows = [
    `inset 2px 0 0 0 ${color}`,
    `inset -2px 0 0 0 ${color}`,
  ];
  if (isTop) shadows.push(`inset 0 2px 0 0 ${color}`);
  if (isBottom) shadows.push(`inset 0 -2px 0 0 ${color}`);
  return shadows.join(", ");
}

function candidateSlotRange(c: Candidate) {
  const startMin = toMinutes(c.start_time);
  const endMin = toMinutes(c.end_time);
  return {
    day: c.day_of_week,
    startSlot: Math.max(0, Math.floor((startMin - 540) / 30)),
    endSlot: Math.min(SLOT_COUNT - 1, Math.ceil((endMin - 540) / 30) - 1),
  };
}

export default function AvailabilityHeatmap({
  availability,
  error,
  onRetry,
  onAddCandidate,
  onSelectCandidate,
  selectedCandidateIds = [],
  confirmedSlot = null,
  candidates = [],
  highlightedCandidate = null,
  members,
  myUserId,
  emails,
  searchStartTime,
  searchEndTime,
  minDurationMin,
}: AvailabilityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [gridHovered, setGridHovered] = useState(false);
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const [bubblePos, setBubblePos] = useState<BubblePos | null>(null);
  const [dragging, setDragging] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const anchorRef = useRef<{ day: number; slot: number } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const searchStartMin = useMemo(() => toMinutes(searchStartTime), [searchStartTime]);
  const searchEndMin = useMemo(() => toMinutes(searchEndTime), [searchEndTime]);

  // #2 기존 후보 시간 블록 (대쉬 테두리 + 반투명 블록용)
  const candidateBlocks = useMemo(
    () => candidates.map((c) => ({ candidate: c, ...candidateSlotRange(c) })),
    [candidates]
  );

  // #1 후보 호버 시 히트맵 하이라이트 범위 (외부 호버 또는 히트맵 내 후보 호버)
  const hoveredCandidateInGrid = useMemo(() => {
    if (hoveredCell === null) return null;
    const day = Math.floor(hoveredCell / SLOT_COUNT);
    const slot = hoveredCell % SLOT_COUNT;
    return (
      candidateBlocks.find(
        (b) => b.day === day && slot >= b.startSlot && slot <= b.endSlot
      )?.candidate ?? null
    );
  }, [hoveredCell, candidateBlocks]);

  const activeHighlightId =
    highlightedCandidate?.candidate_id ?? hoveredCandidateInGrid?.candidate_id ?? null;
  const showCandidateOverlays = gridHovered || highlightedCandidate !== null;
  const selectedSet = useMemo(() => new Set(selectedCandidateIds), [selectedCandidateIds]);
  const confirmedRange = useMemo(() => {
    if (!confirmedSlot) return null;
    const startMin = toMinutes(confirmedSlot.start_time);
    const endMin = toMinutes(confirmedSlot.end_time);
    return {
      day: confirmedSlot.day_of_week,
      startSlot: Math.max(0, Math.floor((startMin - 540) / 30)),
      endSlot: Math.min(SLOT_COUNT - 1, Math.ceil((endMin - 540) / 30) - 1),
    };
  }, [confirmedSlot]);

  // #4 드래그 선택 구간의 실시간 교집합 가능/불가 팀원 요약
  const dragSummary = useMemo(() => {
    if (!selection || !availability) return null;
    let commonIds: Set<number> | null = null;
    for (let s = selection.startSlot; s <= selection.endSlot; s += 1) {
      const cellIds = new Set(availability.slots[index(selection.day, s)] ?? []);
      if (commonIds === null) {
        commonIds = cellIds;
      } else {
        const next = new Set<number>();
        for (const id of commonIds) {
          if (cellIds.has(id)) next.add(id);
        }
        commonIds = next;
      }
    }
    const okSet = commonIds ?? new Set<number>();
    return {
      available: members.filter((m) => okSet.has(m.member_id)),
      unavailable: members.filter((m) => !okSet.has(m.member_id)),
    };
  }, [selection, availability, members]);

  const hoveredInfo = useMemo(() => {
    if (hoveredCell === null || !availability) return null;
    const day = Math.floor(hoveredCell / SLOT_COUNT);
    const slot = hoveredCell % SLOT_COUNT;
    const availableIds = new Set(availability.slots[hoveredCell] ?? []);
    const availableMembers = members.filter((m) => availableIds.has(m.member_id));
    const unavailableMembers = members.filter((m) => !availableIds.has(m.member_id));
    return { day, slot, availableMembers, unavailableMembers };
  }, [hoveredCell, availability, members]);

  function computeBubblePos(sel: SlotSelection) {
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const endCellId = index(sel.day, sel.endSlot);
    const cellEl = gridEl.querySelector<HTMLElement>(`[data-hcell="${endCellId}"]`);
    if (!cellEl) return;

    const top = cellEl.offsetTop + cellEl.offsetHeight + 10;
    const align: BubblePos["align"] =
      sel.day <= 1 ? "left" : sel.day >= 5 ? "right" : "center";
    const left =
      align === "left"
        ? cellEl.offsetLeft
        : align === "right"
          ? cellEl.offsetLeft + cellEl.offsetWidth
          : cellEl.offsetLeft + cellEl.offsetWidth / 2;
    setBubblePos({ top, left, align });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!onAddCandidate || e.button !== 0) return;
    const hit = cellFromPoint(e.clientX, e.clientY);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    anchorRef.current = hit;
    setAddError(null);
    setBubblePos(null);
    setDragging(true);
    setSelection({ day: hit.day, startSlot: hit.slot, endSlot: hit.slot });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const hit = cellFromPoint(e.clientX, e.clientY);
    if (hit) setHoveredCell(index(hit.day, hit.slot));
    if (!dragging || !anchorRef.current || !hit) return;
    const anchor = anchorRef.current;
    setSelection({
      day: anchor.day,
      startSlot: Math.min(anchor.slot, hit.slot),
      endSlot: Math.max(anchor.slot, hit.slot),
    });
  }

  function stopDragging() {
    if (!dragging) return;
    anchorRef.current = null;
    setDragging(false);
    if (selection) {
      // 단일 칸 클릭이고 기존 후보 블록 위라면 아래 해당 후보로 포커스 이동
      if (selection.startSlot === selection.endSlot && onSelectCandidate) {
        const hitBlock = candidateBlocks.find(
          (b) =>
            b.day === selection.day &&
            selection.startSlot >= b.startSlot &&
            selection.startSlot <= b.endSlot
        );
        if (hitBlock) {
          setSelection(null);
          setBubblePos(null);
          onSelectCandidate(hitBlock.candidate.candidate_id);
          return;
        }
      }
      computeBubblePos(selection);
    }
  }

  async function handleConfirmAdd() {
    if (!selection || !onAddCandidate) return;
    setAddError(null);
    setAdding(true);
    try {
      await onAddCandidate({
        day_of_week: selection.day,
        start_time: slotLabel(selection.startSlot),
        end_time: slotLabel(selection.endSlot + 1),
      });
      setSelection(null);
      setBubblePos(null);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "후보 시간을 추가하지 못했어요.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-ink-text">주간 공강 히트맵</h2>
          {availability && (
            <span className="text-xs text-ink-text-weak tabular-nums">
              시간표 등록 {availability.registered_member_count}/{availability.total_member_count}명
            </span>
          )}
        </div>

        {/* 농도 범례 */}
        <div className="flex items-center gap-1.5 text-[11px] text-ink-text-3">
          <span>적음</span>
          <span className="size-3 rounded-[3px] border border-ink-line bg-transparent" />
          <span className="size-3 rounded-[3px] bg-emerald-500/20 dark:bg-emerald-400/20" />
          <span className="size-3 rounded-[3px] bg-emerald-500/50 dark:bg-emerald-400/45" />
          <span className="size-3 rounded-[3px] bg-emerald-600/65 dark:bg-emerald-400/60" />
          <span className="size-3 rounded-[3px] bg-emerald-600/80 dark:bg-neon/65" />
          <span>전원 가능</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-ink-line bg-ink-1 px-4 py-3 text-xs">
          <span className="text-live">{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[6px] border border-ink-line-2 px-2.5 py-1 font-semibold text-ink-text hover:bg-ink-2"
          >
            다시 시도
          </button>
        </div>
      )}

      {!error && availability === undefined && (
        <div className="h-72 animate-pulse rounded-[12px] border border-ink-line bg-ink-1" />
      )}

      {!error && availability && (
        <div className="flex flex-col gap-2">
          <WeeklySlotGrid
            gridRef={gridRef}
            scrollContainerClassName="pb-12"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onMouseEnter={() => setGridHovered(true)}
            onMouseLeave={() => {
              setGridHovered(false);
              setHoveredCell(null);
            }}
            inspector={
              selection && dragSummary ? (
                <>
                  <span className="font-bold text-neon tabular-nums">
                    선택: {DAY_LABELS[selection.day]}요일 {slotLabel(selection.startSlot)} ~{" "}
                    {slotLabel(selection.endSlot + 1)}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-text tabular-nums">
                      {dragSummary.available.length}/{members.length}명 가능
                    </span>
                    {dragSummary.unavailable.length > 0 && (
                      <span className="text-ink-text-weak">
                        · 어려움:{" "}
                        {dragSummary.unavailable
                          .map((m) => memberLabel(m, myUserId, emails))
                          .join(", ")}
                      </span>
                    )}
                  </div>
                </>
              ) : hoveredInfo ? (
                <>
                  <span className="font-bold text-ink-text tabular-nums">
                    {DAY_LABELS[hoveredInfo.day]}요일 {formatSlotRange(hoveredInfo.slot)}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-neon tabular-nums">
                      {hoveredInfo.availableMembers.length}명 가능
                    </span>
                    {hoveredInfo.availableMembers.length > 0 && (
                      <span className="text-ink-text-2">
                        ({hoveredInfo.availableMembers
                          .map((m) => memberLabel(m, myUserId, emails))
                          .join(", ")})
                      </span>
                    )}
                    {hoveredInfo.unavailableMembers.length > 0 && (
                      <span className="text-ink-text-weak">
                        · 불가:{" "}
                        {hoveredInfo.unavailableMembers
                          .map((m) => memberLabel(m, myUserId, emails))
                          .join(", ")}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-ink-text-3">
                  칸을 드래그하면 원하는 시간대를 직접 후보 시간으로 추가할 수 있어요.
                </span>
              )
            }
            renderCell={({ day, slot, cell, baseCellClass }) => {
              const count = availability.slots[cell]?.length ?? 0;
              const isHovered = hoveredCell === cell;
              const isSelected =
                selection !== null &&
                selection.day === day &&
                slot >= selection.startSlot &&
                slot <= selection.endSlot;
              const startingBlocks = candidateBlocks.filter(
                (b) => b.day === day && b.startSlot === slot
              );
              const slotStartMin = 9 * 60 + slot * 30;
              const inSearchWindow =
                slotStartMin >= searchStartMin && slotStartMin + 30 <= searchEndMin;
              const isTop = isSelected && slot === selection.startSlot;
              const isBottom = isSelected && slot === selection.endSlot;

              return (
                <div
                  key={cell}
                  data-hcell={cell}
                  role="gridcell"
                  aria-label={`${DAY_LABELS[day]}요일 ${formatSlotRange(slot)} ${count}명 가능`}
                  style={
                    isSelected
                      ? { boxShadow: blockShadow(isTop, isBottom, "var(--c-neon)") }
                      : undefined
                  }
                  className={`${baseCellClass} cursor-crosshair transition-opacity ${slotTone(
                    count,
                    availability.registered_member_count
                  )} ${inSearchWindow ? "" : "opacity-35"} ${
                    isSelected
                      ? "z-20 border-transparent after:pointer-events-none after:absolute after:inset-0 after:bg-neon/20"
                      : isHovered
                        ? "z-10 ring-1 ring-ink-text"
                        : ""
                  }`}
                >
                  {/* #2 & #1 기존 후보 블록 */}
                  {startingBlocks.map((b) => {
                    if (confirmedSlot?.candidate_id === b.candidate.candidate_id) return null;
                    const span = b.endSlot - b.startSlot + 1;
                    const isVoted = selectedSet.has(b.candidate.candidate_id);
                    const emphasized =
                      activeHighlightId === b.candidate.candidate_id || isVoted;
                    return (
                      <div
                        key={b.candidate.candidate_id}
                        aria-hidden
                        style={{ height: `${span * 20}px` }}
                        className={`pointer-events-none absolute top-0 left-0 w-full transition-opacity duration-200 ease-out ${
                          showCandidateOverlays ? "opacity-100" : "opacity-0"
                        } ${emphasized ? "z-25 text-neon" : "z-15 text-ink-text"}`}
                      >
                        <svg className="size-full">
                          <rect
                            x="1"
                            y="1"
                            width="calc(100% - 2px)"
                            height="calc(100% - 2px)"
                            rx="3"
                            fill="currentColor"
                            fillOpacity={emphasized ? 0.18 : 0.08}
                            stroke="currentColor"
                            strokeOpacity={emphasized ? 1 : 0.62}
                            strokeWidth={emphasized ? 2 : 1.5}
                            strokeDasharray="4 3"
                            className={
                              activeHighlightId === b.candidate.candidate_id
                                ? "animate-dash-march"
                                : ""
                            }
                          />
                        </svg>
                        <span
                          className={`absolute top-1 right-1 grid min-w-3.5 place-items-center rounded-full px-1 text-[9px] leading-3.5 font-bold tabular-nums shadow-xs ${
                            isVoted || activeHighlightId === b.candidate.candidate_id
                              ? "bg-neon text-on-neon"
                              : "border border-ink-line-2 bg-ink-base/90 text-ink-text"
                          }`}
                        >
                          {b.candidate.available_count}
                        </span>
                      </div>
                    );
                  })}

                  {/* 확정 일정 활성 시간 카드 */}
                  {confirmedSlot &&
                    confirmedRange &&
                    confirmedRange.day === day &&
                    confirmedRange.startSlot === slot && (
                      <div
                        aria-label={`확정 일정 ${DAY_LABELS[day]}요일 ${toHHMM(confirmedSlot.start_time)}~${toHHMM(confirmedSlot.end_time)}`}
                        style={{
                          height: `${(confirmedRange.endSlot - confirmedRange.startSlot + 1) * 20}px`,
                        }}
                        className="pointer-events-none absolute top-0 left-0 z-30 flex w-full flex-col items-center justify-center gap-0.5 rounded-[6px] border-2 border-neon bg-neon/25 px-1 text-center shadow-[0_0_16px_rgba(0,255,163,0.28)] backdrop-blur-[1px]"
                      >
                        <span className="rounded bg-neon px-1.5 py-0.5 text-[9px] leading-none font-bold text-on-neon">
                          확정
                        </span>
                        {confirmedRange.endSlot - confirmedRange.startSlot >= 1 && (
                          <span className="text-[9px] leading-tight font-bold text-ink-text tabular-nums">
                            {toHHMM(confirmedSlot.start_time)}–{toHHMM(confirmedSlot.end_time)}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              );
            }}
            overlay={
              selection && !dragging && bubblePos && onAddCandidate ? (
                <div
                  role="dialog"
                  aria-label="선택한 시간 후보 추가"
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    top: bubblePos.top,
                    left: bubblePos.left,
                    transform:
                      bubblePos.align === "center"
                        ? "translateX(-50%)"
                        : bubblePos.align === "right"
                          ? "translateX(-100%)"
                          : "none",
                  }}
                  className="absolute z-30 flex items-center gap-2 rounded-[10px] border border-neon/50 bg-ink-base px-3 py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
                >
                  <span
                    aria-hidden
                    className={`absolute -top-1.5 size-2.5 rotate-45 border-t border-l border-neon/50 bg-ink-base ${
                      bubblePos.align === "left"
                        ? "left-5"
                        : bubblePos.align === "right"
                          ? "right-5"
                          : "left-1/2 -translate-x-1/2"
                    }`}
                  />
                  <span className="text-xs font-bold whitespace-nowrap text-ink-text tabular-nums">
                    {DAY_LABELS[selection.day]}요일 {slotLabel(selection.startSlot)}~
                    {slotLabel(selection.endSlot + 1)}
                  </span>
                  {minDurationMin !== undefined &&
                    (selection.endSlot - selection.startSlot + 1) * 30 < minDurationMin && (
                      <span className="rounded bg-live/15 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-live">
                        최소 {minDurationMin}분 미만
                      </span>
                    )}
                  <button
                    type="button"
                    disabled={adding}
                    onClick={handleConfirmAdd}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[6px] bg-neon px-2.5 text-xs font-bold whitespace-nowrap text-on-neon transition-colors hover:bg-neon-2 disabled:opacity-50"
                  >
                    <Plus className="size-3.5" strokeWidth={2.5} />
                    {adding ? "추가 중" : "후보 시간 추가"}
                  </button>
                  <button
                    type="button"
                    aria-label="선택 취소"
                    onClick={() => {
                      setSelection(null);
                      setBubblePos(null);
                      setAddError(null);
                    }}
                    className="grid size-6 shrink-0 place-items-center rounded text-ink-text-3 hover:bg-ink-2 hover:text-ink-text"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : null
            }
          />

          {addError && (
            <p className="text-xs font-medium text-live">{addError}</p>
          )}
        </div>
      )}
    </section>
  );
}
