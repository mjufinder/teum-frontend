"use client";

import { ArrowLeft, CalendarPlus, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import TimetableEditor from "@/components/timetable/TimetableEditor";
import TimetableUpload from "@/components/timetable/TimetableUpload";
import { ApiError } from "@/lib/api";
import { getMyTimetable } from "@/lib/timetable-api";
import type { RecognizedTimetable, TimetableBits } from "@/types/timetable";

type TimetableViewMode = "idle" | "uploading" | "editing";

const STEPS = [
  { id: "upload", label: "업로드" },
  { id: "review", label: "확인" },
  { id: "save", label: "저장" },
] as const;

export default function MyTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<TimetableViewMode>("idle");
  const [savedOnce, setSavedOnce] = useState(false);
  const [bits, setBits] = useState<TimetableBits | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  // 인식 결과가 들어오면 편집기 상태를 새로 시작한다.
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    getMyTimetable()
      .then((timetable) => {
        setBits(timetable);
        setViewMode(timetable ? "editing" : "idle");
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

  function handleReupload() {
    const ok = confirm(
      "수업 시간만 인식 결과로 바꾸고 개인 일정은 그대로 둬요. 저장해야 반영돼요. 계속할까요?"
    );
    if (ok) {
      setSavedOnce(false);
      setViewMode("uploading");
    }
  }

  function handleRecognized(result: RecognizedTimetable) {
    setBits((prev) =>
      prev ? { class_bits: result.class_bits, manual_bits: prev.manual_bits } : prev
    );
    setWarnings(result.warnings);
    setEditorKey((key) => key + 1);
    setSavedOnce(false);
    setViewMode("editing");
  }

  const activeStepIndex =
    viewMode === "uploading" ? 0 : viewMode === "editing" ? (savedOnce ? 2 : 1) : -1;

  function renderContent() {
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
    if (viewMode === "idle" || !bits) {
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
    if (viewMode === "uploading") {
      return (
        <TimetableUpload
          onRecognized={handleRecognized}
          onManual={() => setViewMode("editing")}
          onCancel={() => setViewMode("editing")}
        />
      );
    }
    return (
      <TimetableEditor
        key={editorKey}
        initial={bits}
        warnings={warnings}
        onSaved={() => setSavedOnce(true)}
        onReupload={handleReupload}
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

          {/* #9 단계 indicator (업로드 → 확인 → 저장) */}
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
            수업과 개인 일정을 칠해두면 모든 모임 공강 계산에 자동으로 반영돼요.
          </p>
        </div>
      </header>

      {renderContent()}
    </div>
  );
}
