"use client";

import { Check, Eraser, ImageUp, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import TimetableGrid from "@/components/timetable/TimetableGrid";
import { ApiError } from "@/lib/api";
import { TOTAL_SLOTS, paintCells, slotState } from "@/lib/timetable";
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
  const [bits, setBits] = useState(initial);
  const [tool, setTool] = useState<SlotState>("class");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    let classSlots = 0;
    let manualSlots = 0;
    for (let i = 0; i < TOTAL_SLOTS; i += 1) {
      const s = slotState(bits, i);
      if (s === "class") classSlots += 1;
      else if (s === "manual") manualSlots += 1;
    }
    const freeSlots = TOTAL_SLOTS - classSlots - manualSlots;
    return {
      classHours: classSlots * 0.5,
      manualHours: manualSlots * 0.5,
      freeHours: freeSlots * 0.5,
      freePercent: Math.round((freeSlots / TOTAL_SLOTS) * 100),
      classPercent: Math.round((classSlots / TOTAL_SLOTS) * 100),
      manualPercent: Math.round((manualSlots / TOTAL_SLOTS) * 100),
    };
  }, [bits]);

  function handlePaint(cells: number[]) {
    setBits((prev) => paintCells(prev, cells, tool));
    setSaved(false);
    setDirty(true);
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await saveMyTimetable(bits.class_bits, bits.manual_bits);
      setSaved(true);
      setDirty(false);
      onSaved?.();
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
      {/* 주간 요약 바 */}
      <div className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          <span className="text-ink-text-3">
            수업 <strong className="ml-1 text-ink-text tabular-nums">{stats.classHours}시간</strong>
          </span>
          <span className="text-ink-text-3">
            개인 일정{" "}
            <strong className="ml-1 text-ink-text tabular-nums">{stats.manualHours}시간</strong>
          </span>
          <span className="text-ink-text-3">
            주간 공강{" "}
            <strong className="ml-1 text-neon tabular-nums">
              {stats.freeHours}시간 ({stats.freePercent}%)
            </strong>
          </span>
        </div>

        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-ink-base sm:w-44">
          <div style={{ width: `${stats.classPercent}%` }} className="bg-neon" />
          <div style={{ width: `${stats.manualPercent}%` }} className="bg-neon/35" />
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

      {/* 통합 에디터 툴바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex flex-wrap items-center gap-2">
          {onReupload && (
            <button
              type="button"
              onClick={onReupload}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-line-2 bg-ink-1 px-3.5 text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text"
            >
              <ImageUp className="size-3.5 text-neon" />
              이미지로 다시 등록
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-neon px-4 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:opacity-50"
          >
            {saved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
            {saving ? "저장 중..." : saved ? "저장됨" : dirty ? "변경사항 저장" : "저장"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-[10px] border-l-2 border-live bg-ink-1 px-4 py-2.5 text-xs text-live">
          {error}
        </p>
      )}

      <TimetableGrid bits={bits} onPaint={handlePaint} />

      <p className="text-center text-xs text-ink-text-3">
        이미지 인식은 월~금만 지원해요. 토·일 개인 일정은 직접 칠해 주세요.
      </p>
    </div>
  );
}
