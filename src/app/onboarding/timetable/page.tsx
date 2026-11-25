"use client";

import { ArrowRight, Grid3x3, ImageUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import TimetableEditor from "@/components/timetable/TimetableEditor";
import TimetableUpload from "@/components/timetable/TimetableUpload";
import { ApiError } from "@/lib/api";
import { emptyBits } from "@/lib/timetable";
import { getMyTimetable } from "@/lib/timetable-api";
import type { RecognizedTimetable, TimetableBits } from "@/types/timetable";

export default function OnboardingTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bits, setBits] = useState<TimetableBits | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

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

  function startManual() {
    setBits({ class_bits: emptyBits(), manual_bits: emptyBits() });
  }

  function handleRecognized(result: RecognizedTimetable) {
    setBits({ class_bits: result.class_bits, manual_bits: result.manual_bits });
    setWarnings(result.warnings);
  }

  function renderContent() {
    if (loading) {
      return (
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-24 rounded-[16px] bg-ink-1" />
          <div className="h-[26rem] rounded-[16px] bg-ink-1" />
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
    if (bits) {
      return (
        <TimetableEditor
          initial={bits}
          warnings={warnings}
          onSaved={() => router.push("/meetings")}
        />
      );
    }
    if (uploading) {
      return (
        <TimetableUpload
          onRecognized={handleRecognized}
          onManual={startManual}
          onCancel={() => setUploading(false)}
        />
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setUploading(true)}
          className="group flex flex-col items-start justify-between gap-6 rounded-[18px] border border-ink-line bg-ink-1/85 p-6 text-left shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all hover:border-neon/60 hover:bg-ink-1"
        >
          <div className="flex flex-col gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-neon/15 text-neon">
              <ImageUp className="size-5" aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink-text">이미지로 자동 등록</h2>
                <span className="rounded-full bg-neon/15 px-2 py-0.5 text-[11px] font-bold text-neon-3">
                  추천
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-text-3">
                에브리타임 시간표 캡처 이미지를 올리면 수업 시간을 자동으로 인식해 채워 드려요.
              </p>
            </div>
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-neon px-5 text-sm font-bold text-on-neon transition-colors group-hover:bg-neon-2">
            이미지 업로드
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </button>

        <button
          type="button"
          onClick={startManual}
          className="group flex flex-col items-start justify-between gap-6 rounded-[18px] border border-ink-line bg-ink-1/85 p-6 text-left shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all hover:border-ink-line-2 hover:bg-ink-1"
        >
          <div className="flex flex-col gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-ink-2 text-ink-text-2">
              <Grid3x3 className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-text">직접 시간표 입력</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-text-3">
                빈 시간표 격자에서 수업 시간과 개인 일정을 드래그로 직접 선택할 수 있어요.
              </p>
            </div>
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-ink-line-2 bg-transparent px-5 text-sm font-bold text-ink-text transition-colors group-hover:bg-ink-2">
            직접 입력하기
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.1em] text-ink-text-3 uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-neon" />
          STEP 2 · 시간표 등록
        </span>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-ink-text">
          시간표를 등록해 주세요
        </h1>
        <p className="text-sm text-ink-text-3">
          등록한 시간표를 바탕으로 팀원들과 겹치는 공강 시간을 바로 계산해 드립니다.
        </p>
      </div>
      {renderContent()}
    </div>
  );
}
