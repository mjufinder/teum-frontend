"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import Logo from "@/components/layout/Logo";
import { formatSlot } from "@/components/meeting/CandidateList";
import { ApiError } from "@/lib/api";
import { getSharedSchedule } from "@/lib/confirm";
import type { PublicSchedule } from "@/types/vote";

function formatConfirmedAt(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

function SharedSchedule() {
  const { token } = useParams<{ token: string }>();
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSharedSchedule(token)
      .then(setSchedule)
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 404
            ? "유효하지 않거나 만료된 링크예요. 링크를 보낸 사람에게 새 링크를 요청해 주세요."
            : "일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        )
      );
  }, [token]);

  return (
    <>
      {error ? (
        <p className="notice notice-danger">{error}</p>
      ) : !schedule ? (
        <p className="text-sm text-muted">불러오는 중...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <h1 className="page-title">{schedule.meeting_name}</h1>
          <div className="flex flex-col gap-1 rounded-[8px] bg-brand p-5 text-white">
            <span className="text-sm text-white/85">확정된 모임 시간</span>
            <span className="text-[1.75rem] leading-tight font-bold tracking-[-0.015em] tabular-nums">
              매주 {formatSlot(schedule.day_of_week, schedule.start_time, schedule.end_time)}
            </span>
          </div>
          <p className="text-xs text-muted">{formatConfirmedAt(schedule.confirmed_at)} 확정</p>
        </div>
      )}
    </>
  );
}

// 로그인 없이 확정 일정을 보는 공개 페이지 (VOTE-04)
export default function SharedSchedulePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-5 py-12">
      <Link href="/" aria-label="틈 처음 화면" className="self-start">
        <Logo />
      </Link>
      <div className="card">
        <Suspense fallback={<p className="text-sm text-muted">불러오는 중...</p>}>
          <SharedSchedule />
        </Suspense>
      </div>
      <Link href="/" className="text-link self-start text-sm">
        틈으로 우리 팀 시간도 찾아보기
      </Link>
    </main>
  );
}
