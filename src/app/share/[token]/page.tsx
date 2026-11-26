import { Suspense } from "react";
import type { Metadata } from "next";

import SharedScheduleClient from "@/app/share/[token]/SharedScheduleClient";
import TeumLoader from "@/components/layout/TeumLoader";
import { toHHMM } from "@/lib/meetings";
import type { PublicSchedule } from "@/types/vote";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

async function fetchPublicSchedule(token: string): Promise<PublicSchedule | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/share/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicSchedule;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const schedule = await fetchPublicSchedule(token);

  if (!schedule) {
    return {
      title: "확정된 모임 일정 · 틈",
      description: "팀원 시간표로 공강을 찾아 회의 시간을 정해요",
    };
  }

  const day = DAY_NAMES[schedule.day_of_week] ?? "";
  const timeRange = `${toHHMM(schedule.start_time)}–${toHHMM(schedule.end_time)}`;
  const title = `${schedule.meeting_name} · 매주 ${day}요일 ${timeRange}`;
  const description = schedule.description
    ? `${schedule.description} (${timeRange} 확정)`
    : `매주 ${day}요일 ${timeRange} 확정된 모임 일정입니다.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

async function ScheduleContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedScheduleClient token={token} />;
}

// 로그인 없이 확정 일정을 보는 공개 페이지 (VOTE-04)
export default function SharedSchedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<TeumLoader fullScreen />}>
      <ScheduleContent params={params} />
    </Suspense>
  );
}
