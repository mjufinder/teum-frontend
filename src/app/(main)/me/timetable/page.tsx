"use client";

import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  Check,
  Download,
  ImageUp,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import TimetableEditor from "@/components/timetable/TimetableEditor";
import {
  TimetableExportPanel,
  TimetablePresetsPanel,
  TimetableStatsPanel,
} from "@/components/timetable/TimetableSidePanels";
import TimetableUpload from "@/components/timetable/TimetableUpload";
import { ApiError } from "@/lib/api";
import { getMyTimetable } from "@/lib/timetable-api";
import type { RecognizedTimetable, TimetableBits } from "@/types/timetable";

type TimetableTab = "grid" | "upload" | "presets" | "stats" | "export";

const MENU_TABS: { id: TimetableTab; label: string; icon: typeof CalendarDays }[] = [
  { id: "grid", label: "내 시간표", icon: CalendarDays },
  { id: "upload", label: "이미지로 등록", icon: ImageUp },
  { id: "presets", label: "고정 일정 · 프리셋", icon: SlidersHorizontal },
  { id: "stats", label: "시간표 요약 · 통계", icon: BarChart3 },
  { id: "export", label: "내보내기 · 단축키", icon: Download },
];

const STEPS = [
  { id: "upload", label: "업로드" },
  { id: "review", label: "확인" },
  { id: "save", label: "저장" },
] as const;

export default function MyTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TimetableTab>("grid");
  const [savedOnce, setSavedOnce] = useState(false);
  const [bits, setBits] = useState<TimetableBits | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  // 인식 결과나 프리셋이 반영되면 편집기 히스토리를 새로 시작한다.
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    getMyTimetable()
      .then((timetable) => {
        setBits(timetable);
        setLoading(false);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "시간표를 불러오지 못했어요.");
        setLoading(false);
      });
  }, [router]);

  function handleRecognized(result: RecognizedTimetable) {
    setBits((prev) =>
      prev ? { class_bits: result.class_bits, manual_bits: prev.manual_bits } : prev
    );
    setWarnings(result.warnings);
    setEditorKey((key) => key + 1);
    setSavedOnce(false);
    setActiveTab("grid");
  }

  const activeStepIndex =
    !bits ? -1 : activeTab === "upload" ? 0 : savedOnce ? 2 : 1;

  function renderMainPanel() {
    if (loading) {
      return (
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-24 rounded-[16px] bg-ink-1" />
          <div className="h-[34rem] rounded-[16px] bg-ink-1" />
        </div>
      );
    }
    if (error) {
      return (
        <p className="rounded-[12px] border-l-2 border-live bg-ink-1 px-4 py-3 text-sm text-ink-text-2">
          {error}
        </p>
      );
    }
    if (!bits) {
      return (
        <div className="flex flex-col items-start gap-4 rounded-[20px] border border-ink-line bg-ink-1 p-8">
          <div className="flex size-11 items-center justify-center rounded-full bg-neon/15 text-neon">
            <CalendarPlus className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-ink-text">아직 등록한 시간표가 없어요</p>
            <p className="text-sm text-ink-text-3">
              에브리타임 시간표 이미지를 올리거나 직접 입력해서 공강 매칭을 시작해 보세요.
            </p>
          </div>
          <Link
            href="/onboarding/timetable"
            className="inline-flex h-10 items-center justify-center rounded-full bg-neon px-5 text-sm font-bold text-on-neon transition-colors hover:bg-neon-2"
          >
            시간표 등록하기
          </Link>
        </div>
      );
    }

    if (activeTab === "upload") {
      return (
        <TimetableUpload
          onRecognized={handleRecognized}
          onManual={() => setActiveTab("grid")}
          onCancel={() => setActiveTab("grid")}
        />
      );
    }
    if (activeTab === "presets") {
      return (
        <TimetablePresetsPanel
          bits={bits}
          onApply={(next) => {
            setBits(next);
            setEditorKey((k) => k + 1);
            setSavedOnce(true);
          }}
          onGoToGrid={() => setActiveTab("grid")}
        />
      );
    }
    if (activeTab === "stats") {
      return <TimetableStatsPanel bits={bits} />;
    }
    if (activeTab === "export") {
      return <TimetableExportPanel bits={bits} />;
    }

    return (
      <TimetableEditor
        key={editorKey}
        initial={bits}
        warnings={warnings}
        onBitsChange={setBits}
        onSaved={() => setSavedOnce(true)}
      />
    );
  }

  return (
    <div className="relative flex flex-col gap-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-44 w-full max-w-[36rem] -translate-x-1/2 rounded-full bg-neon/[0.04] blur-3xl"
      />

      <header className="relative flex flex-col gap-3 border-b border-ink-line pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/me"
            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-ink-text-3 transition-colors hover:text-ink-text"
          >
            <ArrowLeft className="size-3.5" />
            내 정보로 돌아가기
          </Link>

          {activeStepIndex >= 0 && (
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              {STEPS.map((step, idx) => {
                const done = idx < activeStepIndex || (idx === 2 && savedOnce);
                const current = idx === activeStepIndex && !done;
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${
                        done
                          ? "bg-neon/12 text-neon"
                          : current
                            ? "border border-neon/40 bg-ink-1 text-ink-text"
                            : "bg-ink-2 text-ink-text-weak"
                      }`}
                    >
                      {done ? (
                        <Check className="size-3" strokeWidth={2.5} />
                      ) : (
                        <span
                          aria-hidden
                          className={`size-1.5 rounded-full ${
                            current ? "bg-neon" : "bg-ink-text-weak/50"
                          }`}
                        />
                      )}
                      {step.label}
                    </span>
                    {idx < STEPS.length - 1 && (
                      <span aria-hidden className="h-px w-3 bg-ink-line-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.08em] text-ink-text-3 uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-neon" />
            TIMETABLE
          </span>
          <h1 className="text-[1.75rem] leading-[1.25] font-bold tracking-[-0.025em] text-ink-text">
            내 시간표
          </h1>
          <p className="text-sm text-ink-text-3">
            좌측 메뉴에서 시간표 편집, 이미지 등록, 프리셋, 통계 및 내보내기를 이용할 수 있어요.
          </p>
        </div>
      </header>

      {/* 좌측 메뉴(14rem) + 우측 콘텐츠 */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24">
          <nav
            aria-label="내 시간표 메뉴"
            className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
          >
            {MENU_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-10 shrink-0 items-center gap-2.5 rounded-[10px] px-3.5 text-xs font-bold whitespace-nowrap transition-colors lg:w-full ${
                    active
                      ? "bg-neon/12 text-neon"
                      : "text-ink-text-3 hover:bg-ink-1 hover:text-ink-text"
                  }`}
                >
                  <Icon className={`size-4 shrink-0 ${active ? "text-neon" : "text-ink-text-weak"}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">{renderMainPanel()}</section>
      </div>
    </div>
  );
}
