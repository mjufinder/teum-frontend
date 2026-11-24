"use client";

import { Check, CheckCircle2, Eraser, ImageUp, Redo2, Save, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import TimetableGrid from "@/components/timetable/TimetableGrid";
import { ApiError } from "@/lib/api";
import {
  DAY_LABELS,
  SLOT_COUNT,
  TOTAL_SLOTS,
  index,
  paintCells,
  slotState,
} from "@/lib/timetable";
import { saveMyTimetable } from "@/lib/timetable-api";
import type { SlotState, TimetableBits } from "@/types/timetable";

const tools: { state: SlotState; label: string }[] = [
  { state: "class", label: "수업" },
  { state: "manual", label: "개인 일정" },
  { state: "free", label: "지우기" },
];

function Swatch({ state, active }: { state: SlotState; active: boolean }) {
  if (state === "class") {
    return (
      <span
        aria-hidden
        className={`size-3 rounded-[3px] ${
          active ? "bg-on-neon/90" : "bg-emerald-600/80 dark:bg-neon/65"
        }`}
      />
    );
  }
  if (state === "manual") {
    return (
      <span
        aria-hidden
        className={`size-3 rounded-[3px] ${
          active ? "bg-on-neon/45" : "bg-emerald-500/35 dark:bg-emerald-400/30"
        }`}
      />
    );
  }
  return <Eraser aria-hidden className="size-3.5" />;
}

interface TimetableEditorProps {
  initial: TimetableBits;
  warnings?: string[];
  onSaved?: () => void;
  onReupload?: () => void;
}

export default function TimetableEditor({
  initial,
  warnings = [],
  onSaved,
  onReupload,
}: TimetableEditorProps) {
  const router = useRouter();
  const [history, setHistory] = useState<TimetableBits[]>([initial]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const bits = history[historyIndex];

  const [tool, setTool] = useState<SlotState>("class");
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    setHistoryIndex((idx) => (idx > 0 ? idx - 1 : idx));
    setDirty(true);
    setSavedToast(false);
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryIndex((idx) => (idx < history.length - 1 ? idx + 1 : idx));
    setDirty(true);
    setSavedToast(false);
  }, [history.length]);

  // Undo / Redo 키보드 단축키 (Ctrl/Cmd + Z, Ctrl/Cmd + Shift + Z / Ctrl + Y)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        if (canRedo) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo]);

  // 미저장 변경사항이 있을 때 페이지 이탈 경고
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const stats = useMemo(() => {
    let classSlots = 0;
    let manualSlots = 0;
    const dayCounts = Array.from({ length: DAY_LABELS.length }, () => 0);

    for (let day = 0; day < DAY_LABELS.length; day += 1) {
      for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
        const s = slotState(bits, index(day, slot));
        if (s === "class") {
          classSlots += 1;
          dayCounts[day] += 1;
        } else if (s === "manual") {
          manualSlots += 1;
          dayCounts[day] += 1;
        }
      }
    }

    const registeredSlots = classSlots + manualSlots;
    const freeSlots = TOTAL_SLOTS - registeredSlots;
    return {
      classHours: classSlots * 0.5,
      manualHours: manualSlots * 0.5,
      freeHours: freeSlots * 0.5,
      registeredSlots,
      registeredPercent: Math.round((registeredSlots / TOTAL_SLOTS) * 100),
      dayCounts,
    };
  }, [bits]);

  function handlePaint(cells: number[]) {
    const current = history[historyIndex];
    const next = paintCells(current, cells, tool);
    if (
      next.class_bits === current.class_bits &&
      next.manual_bits === current.manual_bits
    ) {
      return;
    }
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), next]);
    setHistoryIndex((idx) => idx + 1);
    setSavedToast(false);
    setDirty(true);
  }

  async function handleSave() {
    setError(null);
    setSavedToast(false);
    setSaving(true);
    try {
      await saveMyTimetable(bits.class_bits, bits.manual_bits);
      setSavedToast(true);
      setDirty(false);
      onSaved?.();
      setTimeout(() => setSavedToast(false), 3000);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* #7 & #8 등록 완료율 프로그레스 + 요일별 등록 슬롯 요약 칩 */}
      <div className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-ink-text">
              {TOTAL_SLOTS}비트 중{" "}
              <strong className="text-neon tabular-nums">{stats.registeredSlots}칸</strong> 등록됨
            </span>
            <span className="text-ink-text-3 tabular-nums">
              수업 {stats.classHours}h · 개인 {stats.manualHours}h · 공강 {stats.freeHours}h
            </span>
          </div>
          <span className="text-xs font-bold text-neon tabular-nums">
            {stats.registeredPercent}%
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-base">
          <div
            style={{ width: `${stats.registeredPercent}%` }}
            className="h-full rounded-full bg-neon transition-all duration-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {DAY_LABELS.map((label, idx) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                stats.dayCounts[idx] > 0
                  ? "border-ink-line-2 bg-ink-base text-ink-text"
                  : "border-ink-line bg-ink-base/50 text-ink-text-weak"
              }`}
            >
              <span>{label}</span>
              <span className={stats.dayCounts[idx] > 0 ? "text-neon" : ""}>
                {stats.dayCounts[idx]}
              </span>
            </span>
          ))}
        </div>
      </div>

      {warnings.map((warning, i) => (
        <div
          key={i}
          className="rounded-[12px] border-l-2 border-neon/60 bg-ink-1 px-4 py-3 text-xs leading-relaxed text-ink-text-2"
        >
          {warning}
        </div>
      ))}

      {/* #3 통합 에디터 툴바 + Undo/Redo + 저장 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex gap-1 rounded-full border border-ink-line bg-ink-1 p-1"
            role="group"
            aria-label="칠하기 도구"
          >
            {tools.map((item) => {
              const active = tool === item.state;
              return (
                <button
                  key={item.state}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTool(item.state)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors ${
                    active
                      ? "bg-neon text-on-neon shadow-xs"
                      : "text-ink-text-3 hover:bg-ink-2 hover:text-ink-text"
                  }`}
                >
                  <Swatch state={item.state} active={active} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-ink-line bg-ink-1 p-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="실행 취소"
              title="실행 취소 (Ctrl+Z)"
              className="grid size-8 place-items-center rounded-full text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Undo2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              aria-label="다시 실행"
              title="다시 실행 (Ctrl+Shift+Z)"
              className="grid size-8 place-items-center rounded-full text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Redo2 className="size-3.5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-neon px-5 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:opacity-50"
        >
          {savedToast ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
          {saving ? "저장 중..." : dirty ? "변경사항 저장" : "저장"}
        </button>
      </div>

      {error && (
        <p className="rounded-[10px] border-l-2 border-live bg-ink-1 px-4 py-2.5 text-xs text-live">
          {error}
        </p>
      )}

      <TimetableGrid bits={bits} onPaint={handlePaint} />

      {/* #10 에디터 하단 "이미지로 다시 등록" (실수 클릭 방지) */}
      {onReupload && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-line pt-4">
          <p className="text-xs text-ink-text-3">
            이미지 인식은 월~금만 지원해요. 토·일 개인 일정은 직접 칠해 주세요.
          </p>
          <button
            type="button"
            onClick={onReupload}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-line-2 px-4 text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text"
          >
            <ImageUp className="size-3.5 text-neon" />
            이미지로 다시 등록
          </button>
        </div>
      )}

      {/* #6 저장 완료 하단 플로팅 토스트 */}
      {savedToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-full border border-neon/40 bg-ink-base px-4 py-2.5 text-xs font-bold text-ink-text shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <CheckCircle2 className="size-4 text-neon" />
          시간표를 저장했어요.
        </div>
      )}
    </div>
  );
}
