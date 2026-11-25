"use client";

import {
  CalendarPlus,
  Check,
  Coffee,
  Download,
  Eraser,
  Keyboard,
  Moon,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  DAY_LABELS,
  SLOT_COUNT,
  TOTAL_SLOTS,
  emptyBits,
  index,
  paintCells,
  slotLabel,
  slotState,
} from "@/lib/timetable";
import { saveMyTimetable } from "@/lib/timetable-api";
import type { SlotState, TimetableBits } from "@/types/timetable";

const ICS_BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function downloadMyTimetableIcs(bits: TimetableBits) {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const events: string[] = [];

  for (let day = 0; day < DAY_LABELS.length; day += 1) {
    let slot = 0;
    while (slot < SLOT_COUNT) {
      const state = slotState(bits, index(day, slot));
      if (state === "free") {
        slot += 1;
        continue;
      }
      let endSlot = slot + 1;
      while (endSlot < SLOT_COUNT && slotState(bits, index(day, endSlot)) === state) {
        endSlot += 1;
      }

      const diffDays = (day - todayIdx + 7) % 7;
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffDays);
      const ymd = `${target.getFullYear()}${pad(target.getMonth() + 1)}${pad(target.getDate())}`;
      const startHHMM = slotLabel(slot).replace(":", "");
      const endHHMM = slotLabel(endSlot).replace(":", "");
      const summary = state === "class" ? "수업" : "개인 일정";

      events.push(
        [
          "BEGIN:VEVENT",
          `UID:teum-tt-${day}-${slot}-${state}@teum`,
          `DTSTAMP:${dtStamp}`,
          `DTSTART;TZID=Asia/Seoul:${ymd}T${startHHMM}00`,
          `DTEND;TZID=Asia/Seoul:${ymd}T${endHHMM}00`,
          `RRULE:FREQ=WEEKLY;BYDAY=${ICS_BYDAY[day]}`,
          `SUMMARY:${summary}`,
          "END:VEVENT",
        ].join("\r\n")
      );
      slot = endSlot;
    }
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TEUM//My Timetable//KO",
    ...events,
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "내_시간표.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ───────────────────── 3. 고정 일정 · 프리셋 패널 ───────────────────── */

interface PresetsPanelProps {
  bits: TimetableBits;
  onApply: (next: TimetableBits) => void;
  onGoToGrid: () => void;
}

export function TimetablePresetsPanel({ bits, onApply, onGoToGrid }: PresetsPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyAndSave(id: string, next: TimetableBits, message: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await saveMyTimetable(next.class_bits, next.manual_bits);
      onApply(next);
      setNotice(message);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "프리셋을 저장하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  }

  function cellsForDays(days: number[], startSlot: number, endSlot: number) {
    const cells: number[] = [];
    for (const day of days) {
      for (let s = startSlot; s < endSlot; s += 1) {
        cells.push(index(day, s));
      }
    }
    return cells;
  }

  const presets: {
    id: string;
    title: string;
    desc: string;
    icon: typeof Utensils;
    tone?: "danger";
    build: () => { next: TimetableBits; msg: string };
  }[] = [
    {
      id: "lunch",
      title: "점심시간 고정 (월~금 12:00–13:00)",
      desc: "평일 점심 1시간을 개인 일정으로 막아 매칭에서 제외해요.",
      icon: Utensils,
      build: () => ({
        next: paintCells(bits, cellsForDays([0, 1, 2, 3, 4], 6, 8), "manual"),
        msg: "월~금 12:00–13:00 점심시간을 반영했어요.",
      }),
    },
    {
      id: "dinner",
      title: "저녁시간 고정 (월~금 18:00–19:00)",
      desc: "평일 저녁 1시간을 개인 일정으로 고정해요.",
      icon: Coffee,
      build: () => ({
        next: paintCells(bits, cellsForDays([0, 1, 2, 3, 4], 18, 20), "manual"),
        msg: "월~금 18:00–19:00 저녁시간을 반영했어요.",
      }),
    },
    {
      id: "weekend",
      title: "주말 전체 개인 일정 (토·일 09:00–22:00)",
      desc: "주말에는 모임이 잡히지 않도록 토·일 전체를 비워둬요.",
      icon: Moon,
      build: () => ({
        next: paintCells(bits, cellsForDays([5, 6], 0, SLOT_COUNT), "manual"),
        msg: "주말 전체를 개인 일정으로 반영했어요.",
      }),
    },
    {
      id: "clear-manual",
      title: "개인 일정만 모두 비우기",
      desc: "수업 시간은 유지하고 직접 칠한 개인 일정만 초기화해요.",
      icon: Eraser,
      tone: "danger",
      build: () => ({
        next: { class_bits: bits.class_bits, manual_bits: emptyBits() },
        msg: "개인 일정을 모두 비웠어요.",
      }),
    },
    {
      id: "clear-all",
      title: "시간표 전체 초기화",
      desc: "수업과 개인 일정을 모두 비우고 처음부터 다시 설정해요.",
      icon: Trash2,
      tone: "danger",
      build: () => ({
        next: { class_bits: emptyBits(), manual_bits: emptyBits() },
        msg: "시간표를 모두 비웠어요.",
      }),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-ink-text">고정 일정 · 프리셋</h2>
          <p className="mt-0.5 text-xs text-ink-text-3">
            자주 반복되는 일정 패턴을 클릭 한 번으로 내 시간표에 저장할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToGrid}
          className="inline-flex h-8 items-center rounded-full border border-ink-line-2 px-3 text-xs font-semibold text-ink-text-2 hover:bg-ink-2 hover:text-ink-text"
        >
          내 시간표에서 보기
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-[10px] border border-neon/40 bg-neon/10 px-3.5 py-2.5 text-xs font-semibold text-neon">
          <Check className="size-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && (
        <p className="rounded-[10px] border-l-2 border-live bg-ink-1 px-3.5 py-2.5 text-xs text-live">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {presets.map((p) => {
          const Icon = p.icon;
          const isDanger = p.tone === "danger";
          return (
            <button
              key={p.id}
              type="button"
              disabled={busyId !== null}
              onClick={() => {
                const { next, msg } = p.build();
                applyAndSave(p.id, next, msg);
              }}
              className={`flex flex-col items-start gap-2 rounded-[14px] border p-4 text-left transition-colors disabled:opacity-50 ${
                isDanger
                  ? "border-live/30 bg-live/[0.03] hover:bg-live/[0.08]"
                  : "border-ink-line bg-ink-1 hover:border-neon/50 hover:bg-ink-2/60"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`grid size-8 place-items-center rounded-[8px] ${
                    isDanger ? "bg-live/15 text-live" : "bg-neon/15 text-neon"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="text-[11px] font-semibold text-ink-text-3">
                  {busyId === p.id ? "적용 중..." : "클릭해 적용"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={`text-sm font-bold ${isDanger ? "text-live" : "text-ink-text"}`}>
                  {p.title}
                </span>
                <span className="text-xs leading-relaxed text-ink-text-3">{p.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────── 4. 시간표 요약 · 통계 패널 ───────────────────── */

export function TimetableStatsPanel({ bits }: { bits: TimetableBits }) {
  const stats = useMemo(() => {
    let classSlots = 0;
    let manualSlots = 0;
    const perDay: {
      label: string;
      classHours: number;
      manualHours: number;
      freeHours: number;
      busyPercent: number;
    }[] = [];

    for (let day = 0; day < DAY_LABELS.length; day += 1) {
      let c = 0;
      let m = 0;
      for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
        const s = slotState(bits, index(day, slot));
        if (s === "class") {
          c += 1;
          classSlots += 1;
        } else if (s === "manual") {
          m += 1;
          manualSlots += 1;
        }
      }
      const free = SLOT_COUNT - c - m;
      perDay.push({
        label: DAY_LABELS[day],
        classHours: c * 0.5,
        manualHours: m * 0.5,
        freeHours: free * 0.5,
        busyPercent: Math.round(((c + m) / SLOT_COUNT) * 100),
      });
    }

    const topFreeDays = [...perDay].sort((a, b) => b.freeHours - a.freeHours).slice(0, 2);
    const totalBusy = classSlots + manualSlots;
    const freeSlots = TOTAL_SLOTS - totalBusy;

    return {
      classHours: classSlots * 0.5,
      manualHours: manualSlots * 0.5,
      freeHours: freeSlots * 0.5,
      freePercent: Math.round((freeSlots / TOTAL_SLOTS) * 100),
      perDay,
      topFreeDays,
    };
  }, [bits]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-ink-text">시간표 요약 · 통계</h2>
        <p className="mt-0.5 text-xs text-ink-text-3">
          주간 09:00–22:00 (총 91시간) 기준 수업·개인 일정·공강 분포예요.
        </p>
      </div>

      {/* 요약 수치 카드 4개 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[14px] border border-ink-line bg-ink-1 p-4">
          <p className="text-xs text-ink-text-3">주간 수업</p>
          <p className="mt-1 text-xl font-bold text-ink-text tabular-nums">{stats.classHours}시간</p>
        </div>
        <div className="rounded-[14px] border border-ink-line bg-ink-1 p-4">
          <p className="text-xs text-ink-text-3">개인 일정</p>
          <p className="mt-1 text-xl font-bold text-ink-text tabular-nums">{stats.manualHours}시간</p>
        </div>
        <div className="rounded-[14px] border border-ink-line bg-ink-1 p-4">
          <p className="text-xs text-ink-text-3">가용 공강</p>
          <p className="mt-1 text-xl font-bold text-neon tabular-nums">{stats.freeHours}시간</p>
        </div>
        <div className="rounded-[14px] border border-ink-line bg-ink-1 p-4">
          <p className="text-xs text-ink-text-3">공강 비율</p>
          <p className="mt-1 text-xl font-bold text-neon tabular-nums">{stats.freePercent}%</p>
        </div>
      </div>

      {/* 가장 여유로운 요일 Top 2 */}
      <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-neon/35 bg-neon/8 px-4 py-3 text-xs">
        <Sparkles className="size-4 shrink-0 text-neon" />
        <span className="font-semibold text-ink-text">가장 여유로운 요일:</span>
        {stats.topFreeDays.map((d) => (
          <span
            key={d.label}
            className="rounded-full bg-ink-base px-2.5 py-0.5 font-bold text-neon tabular-nums"
          >
            {d.label}요일 ({d.freeHours}h 공강)
          </span>
        ))}
      </div>

      {/* 요일별 밀도 막대 */}
      <div className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 p-5">
        <h3 className="text-sm font-bold text-ink-text">요일별 일정 밀도</h3>
        <div className="flex flex-col gap-2.5">
          {stats.perDay.map((d) => (
            <div key={d.label} className="grid grid-cols-[2rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-xs">
              <span className="font-bold text-ink-text">{d.label}</span>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-base">
                <div
                  style={{ width: `${Math.round(((d.classHours * 2) / SLOT_COUNT) * 100)}%` }}
                  className="bg-emerald-600/80 dark:bg-neon/75"
                />
                <div
                  style={{ width: `${Math.round(((d.manualHours * 2) / SLOT_COUNT) * 100)}%` }}
                  className="bg-emerald-500/35 dark:bg-emerald-400/35"
                />
              </div>
              <span className="text-right text-[11px] text-ink-text-3 tabular-nums">
                {d.freeHours}h 공강
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── 5. 내보내기 · 단축키 패널 ───────────────────── */

export function TimetableExportPanel({ bits }: { bits: TimetableBits }) {
  const [downloaded, setDownloaded] = useState(false);

  const busyCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < TOTAL_SLOTS; i += 1) {
      const s: SlotState = slotState(bits, i);
      if (s !== "free") count += 1;
    }
    return count;
  }, [bits]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-ink-text">내보내기 · 단축키</h2>
        <p className="mt-0.5 text-xs text-ink-text-3">
          내 시간표를 외부 캘린더 파일로 저장하거나 편집 단축키를 확인할 수 있어요.
        </p>
      </div>

      {/* .ics 캘린더 내보내기 */}
      <section className="flex flex-col justify-between gap-4 rounded-[16px] border border-ink-line bg-ink-1 p-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-4 text-neon" />
            <h3 className="text-sm font-bold text-ink-text">캘린더 파일(.ics)로 내보내기</h3>
          </div>
          <p className="text-xs text-ink-text-3">
            등록된 수업·개인 일정({busyCount}칸)을 매주 반복 일정으로 Apple · Google 캘린더에 가져올 수 있어요.
          </p>
        </div>
        <button
          type="button"
          disabled={busyCount === 0}
          onClick={() => {
            downloadMyTimetableIcs(bits);
            setDownloaded(true);
            setTimeout(() => setDownloaded(false), 2500);
          }}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-neon px-5 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {downloaded ? <Check className="size-4" /> : <Download className="size-4" />}
          {downloaded ? "저장 완료" : ".ics 다운로드"}
        </button>
      </section>

      {/* 단축키 & 사용 가이드 */}
      <section className="flex flex-col gap-4 rounded-[16px] border border-ink-line bg-ink-1 p-5">
        <div className="flex items-center gap-2">
          <Keyboard className="size-4 text-neon" />
          <h3 className="text-sm font-bold text-ink-text">편집 단축키 & 사용 팁</h3>
        </div>

        <ul className="flex flex-col gap-3 text-xs leading-relaxed text-ink-text-3">
          <li className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-line pb-2.5">
            <span>드래그 연속 칠하기</span>
            <span className="font-semibold text-ink-text">칸을 누른 채 상하좌우 드래그</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-line pb-2.5">
            <span>줄 단위 일괄 선택</span>
            <span className="font-semibold text-ink-text">요일(월~일) · 시간(09:00) 라벨 클릭</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-line pb-2.5">
            <span>실행 취소 (Undo)</span>
            <kbd className="rounded border border-ink-line-2 bg-ink-base px-2 py-0.5 text-[11px] font-bold text-ink-text">
              Ctrl / ⌘ + Z
            </kbd>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-line pb-2.5">
            <span>다시 실행 (Redo)</span>
            <kbd className="rounded border border-ink-line-2 bg-ink-base px-2 py-0.5 text-[11px] font-bold text-ink-text">
              Ctrl / ⌘ + Shift + Z
            </kbd>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>모바일 화면 스크롤 보호</span>
            <span className="font-semibold text-ink-text">그리드 상단 스크롤 모드 토글</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
