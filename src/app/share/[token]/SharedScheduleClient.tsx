"use client";

import { ArrowRight, Download, Link2Off, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ShareActionModal, { type ActionModalMode } from "@/app/share/[token]/ShareActionModal";
import BrandMark from "@/components/layout/BrandMark";
import { ApiError } from "@/lib/api";
import { getSharedSchedule } from "@/lib/confirm";
import { buildGoogleCalendarUrl, downloadMeetingIcs, getNextMeetingOccurrence } from "@/lib/ics";
import { toHHMM } from "@/lib/meetings";
import { applyScheduleToMyTimetable, downloadScheduleCardPng } from "@/lib/share-card";
import { supabase } from "@/lib/supabase";
import type { PublicSchedule } from "@/types/vote";

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-ink-base";

function formatConfirmedAt(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

function formatNextDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatDuration(startTime: string, endTime: string) {
  const [sh, sm] = toHHMM(startTime).split(":").map(Number);
  const [eh, em] = toHHMM(endTime).split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours}시간 ${mins}분`;
  if (hours > 0) return `${hours}시간`;
  return `${mins}분`;
}

function ShareSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-8 py-8">
      <div className="h-4 w-28 rounded-full bg-ink-2" />
      <div className="flex flex-col gap-4">
        <div className="h-9 w-2/3 rounded-lg bg-ink-2" />
        <div className="h-16 w-4/5 rounded-xl bg-ink-2" />
        <div className="h-4 w-1/2 rounded-full bg-ink-2" />
      </div>
      <div className="h-px w-full bg-ink-line/60" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 rounded-full bg-ink-2" />
        <div className="h-12 rounded-full bg-ink-2" />
      </div>
    </div>
  );
}

export default function SharedScheduleClient({ token }: { token: string }) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [error, setError] = useState<{ isNotFound: boolean; message: string } | null>(null);
  const [modalMode, setModalMode] = useState<ActionModalMode>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedPng, setSavedPng] = useState(false);
  const [timetableState, setTimetableState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [liveStatus, setLiveStatus] = useState("");

  // 비로그인 공유 페이지는 버튼 없이 OS/브라우저 시스템 테마를 자동으로 따른다.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = (dark: boolean) => {
      document.documentElement.classList.toggle("dark", dark);
    };
    applySystemTheme(mq.matches);

    const onChange = (e: MediaQueryListEvent) => applySystemTheme(e.matches);
    mq.addEventListener("change", onChange);

    return () => {
      mq.removeEventListener("change", onChange);
      try {
        const saved = localStorage.getItem("theme");
        if (saved === "light") {
          document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.add("dark");
        }
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    getSharedSchedule(token)
      .then(setSchedule)
      .catch((e) => {
        const isNotFound = e instanceof ApiError && e.status === 404;
        setError({
          isNotFound,
          message: isNotFound
            ? "링크가 만료되었거나 모임 관리자가 공유 링크를 새로 발급했을 수 있어요."
            : "일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
      });
  }, [token]);

  async function handleCopyText() {
    if (!schedule) return;
    const dayLabel = DAY_NAMES[schedule.day_of_week] ?? "";
    const timeRange = `${toHHMM(schedule.start_time)}–${toHHMM(schedule.end_time)}`;
    const lines = [
      `[${schedule.meeting_name}] 정기 모임 일정이 확정되었어요!`,
      `일시: 매주 ${dayLabel}요일 ${timeRange}`,
      schedule.description ? `내용: ${schedule.description}` : null,
      `링크: ${window.location.href}`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedText(true);
      setLiveStatus("일정 안내 문구를 클립보드에 복사했습니다.");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      setLiveStatus("클립보드 복사에 실패했습니다.");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setLiveStatus("공유 링크를 클립보드에 복사했습니다.");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setLiveStatus("링크 복사에 실패했습니다.");
    }
  }

  async function handleNativeShare() {
    if (!schedule) return;
    const dayLabel = DAY_NAMES[schedule.day_of_week] ?? "";
    const timeRange = `${toHHMM(schedule.start_time)}–${toHHMM(schedule.end_time)}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: schedule.meeting_name,
          text: `매주 ${dayLabel}요일 ${timeRange} 확정된 모임 일정입니다.`,
          url: window.location.href,
        });
        setLiveStatus("공유 시트를 열었습니다.");
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await handleCopyLink();
  }

  function handleDownloadPng() {
    if (!schedule || !occurrence) return;
    downloadScheduleCardPng({
      meetingName: schedule.meeting_name,
      description: schedule.description,
      memberCount: schedule.member_count,
      dayOfWeek: schedule.day_of_week,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      nextDateLabel: formatNextDate(occurrence.targetDate),
      durationLabel,
      confirmedLabel: formatConfirmedAt(schedule.confirmed_at),
    });
    setSavedPng(true);
    setLiveStatus("일정 카드 이미지를 PNG로 저장했습니다.");
    setTimeout(() => setSavedPng(false), 2000);
  }

  async function handleApplyTimetable() {
    if (!schedule) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setTimetableState("saving");
    try {
      await applyScheduleToMyTimetable(
        schedule.day_of_week,
        schedule.start_time,
        schedule.end_time
      );
      setTimetableState("saved");
      setLiveStatus("내 시간표에 확정 일정이 반영되었습니다.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      setTimetableState("error");
      setLiveStatus("시간표 반영 중 오류가 발생했습니다.");
    }
  }

  const occurrence = schedule
    ? getNextMeetingOccurrence(schedule.day_of_week, schedule.start_time, schedule.end_time)
    : null;
  const durationLabel = schedule ? formatDuration(schedule.start_time, schedule.end_time) : null;

  const dDayLabel = occurrence
    ? occurrence.isOngoing
      ? "지금 진행 중"
      : occurrence.diffDays === 0
        ? "오늘"
        : `D-${occurrence.diffDays}`
    : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-ink-base">
      <p className="sr-only" aria-live="polite">
        {liveStatus}
      </p>

      {/* 풀스크린 앰비언트 네온 글로우 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(0,255,163,0.14),transparent_70%)]"
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-between px-6 py-10 sm:py-14">
        {/* 상단 네비게이션 */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="틈 처음 화면"
            className={`flex items-center gap-2 rounded-full font-bold text-ink-text ${FOCUS_RING}`}
          >
            <BrandMark className="h-5 w-8" />
            <span className="text-base tracking-tight">틈</span>
          </Link>

          {schedule && (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-text-3">
              <span className="size-1.5 rounded-full bg-neon shadow-[0_0_8px_var(--color-neon)]" />
              확정 일정
            </span>
          )}
        </header>

        {/* 중앙 풀-캔버스 에디토리얼 본문 (카드 박스 없음) */}
        <div className="my-auto py-10">
          {error ? (
            <div className="flex flex-col items-start gap-6 py-8">
              <div className="flex size-12 items-center justify-center rounded-full bg-ink-1 text-ink-text-3">
                <Link2Off className="size-5" />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-ink-text">
                  {error.isNotFound
                    ? "유효하지 않거나 만료된 링크예요"
                    : "일정을 불러올 수 없어요"}
                </h1>
                <p className="text-sm leading-relaxed text-ink-text-3">{error.message}</p>
              </div>
              <Link
                href="/"
                className={`inline-flex h-11 items-center gap-2 rounded-full bg-neon px-6 text-sm font-bold text-on-neon transition-colors hover:bg-neon-2 ${FOCUS_RING}`}
              >
                틈 홈으로 이동
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : !schedule ? (
            <ShareSkeleton />
          ) : (
            <div className="flex flex-col gap-8">
              {/* 요일 & 참여 인원 */}
              <div className="flex flex-wrap items-center gap-2.5 text-sm">
                <span className="font-bold text-neon">
                  매주 {DAY_NAMES[schedule.day_of_week] ?? ""}요일
                </span>
                {dDayLabel && (
                  <span className="rounded-full bg-neon/14 px-2.5 py-0.5 text-xs font-bold text-neon tabular-nums">
                    {dDayLabel}
                  </span>
                )}
                {typeof schedule.member_count === "number" && schedule.member_count > 0 && (
                  <span className="text-ink-text-3">· {schedule.member_count}명 참여</span>
                )}
              </div>

              {/* 모임명 + 초대형 시간 타이포그래피 */}
              <div className="flex flex-col gap-4">
                <h1 className="text-2xl leading-snug font-bold tracking-[-0.03em] text-ink-text sm:text-3xl">
                  {schedule.meeting_name}
                </h1>

                <div className="text-[3.1rem] leading-[0.98] font-bold tracking-[-0.045em] text-ink-text tabular-nums sm:text-[3.85rem]">
                  {toHHMM(schedule.start_time)}
                  <span className="mx-2 font-light text-ink-text-3">–</span>
                  {toHHMM(schedule.end_time)}
                </div>

                {schedule.description && (
                  <p className="max-w-md text-sm leading-relaxed text-ink-text-2">
                    {schedule.description}
                  </p>
                )}
              </div>

              {/* 에디토리얼 메타 스트립 */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-ink-line/60 py-4 text-xs">
                {occurrence && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-ink-text-3">다음 모임</span>
                    <span className="font-semibold text-ink-text">
                      {formatNextDate(occurrence.targetDate)}
                    </span>
                  </div>
                )}
                {durationLabel && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-ink-text-3">진행 시간</span>
                    <span className="font-semibold text-ink-text">{durationLabel} (KST)</span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-ink-text-3">확정일</span>
                  <span className="font-semibold text-ink-text">
                    {formatConfirmedAt(schedule.confirmed_at)}
                  </span>
                </div>
              </div>

              {/* 1:1 가로 저장하기 / 공유하기 버튼 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode("save")}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-neon px-5 text-sm font-bold text-on-neon transition-transform active:scale-[0.99] hover:bg-neon-2 ${FOCUS_RING}`}
                >
                  <Download className="size-4" />
                  저장하기
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode("share")}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink-1 px-5 text-sm font-semibold text-ink-text transition-transform active:scale-[0.99] hover:bg-ink-2 ${FOCUS_RING}`}
                >
                  <Share2 className="size-4 text-neon" />
                  공유하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 하단 푸터 */}
        <footer className="flex items-center justify-between text-xs text-ink-text-3">
          <span>틈 · 공강 시간 매칭</span>
          <Link
            href="/"
            className={`inline-flex items-center gap-1 rounded-full font-semibold text-neon hover:underline ${FOCUS_RING}`}
          >
            우리 팀 시간도 찾기
            <ArrowRight className="size-3.5" />
          </Link>
        </footer>
      </main>

      {schedule && (
        <ShareActionModal
          mode={modalMode}
          url={modalMode ? window.location.href : ""}
          meetingName={schedule.meeting_name}
          canNativeShare={
            typeof navigator !== "undefined" && typeof navigator.share === "function"
          }
          copiedLink={copiedLink}
          copiedText={copiedText}
          savedPng={savedPng}
          timetableState={timetableState}
          googleCalendarUrl={buildGoogleCalendarUrl({
            meetingName: schedule.meeting_name,
            description: schedule.description,
            dayOfWeek: schedule.day_of_week,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
          })}
          onClose={() => setModalMode(null)}
          onDownloadIcs={() =>
            downloadMeetingIcs({
              meetingName: schedule.meeting_name,
              description: schedule.description,
              dayOfWeek: schedule.day_of_week,
              startTime: schedule.start_time,
              endTime: schedule.end_time,
            })
          }
          onDownloadPng={handleDownloadPng}
          onApplyTimetable={handleApplyTimetable}
          onNativeShare={handleNativeShare}
          onCopyLink={handleCopyLink}
          onCopyText={handleCopyText}
        />
      )}
    </div>
  );
}
