import { ImageResponse } from "next/og";

import { toHHMM } from "@/lib/meetings";
import type { PublicSchedule } from "@/types/vote";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

export default async function ShareOpenGraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const schedule = await fetchPublicSchedule(token);

  const meetingName = schedule?.meeting_name ?? "틈 · 확정 모임 일정";
  const slotText = schedule
    ? `매주 ${DAY_NAMES[schedule.day_of_week] ?? ""}요일 ${toHHMM(schedule.start_time)} – ${toHHMM(schedule.end_time)}`
    : "팀원 시간표로 공강을 찾아 회의 시간을 정해요";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0e0c",
          color: "#f4f7f5",
          padding: "64px 72px",
          borderTop: "10px solid #00ffa3",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: 32,
              fontWeight: 700,
              color: "#00ffa3",
            }}
          >
            <span>틈 TEUM</span>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: "999px",
              backgroundColor: "rgba(0, 255, 163, 0.14)",
              border: "1px solid rgba(0, 255, 163, 0.4)",
              color: "#00ffa3",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            확정된 정기 일정
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>{meetingName}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "28px 36px",
              borderRadius: "20px",
              backgroundColor: "rgba(0, 255, 163, 0.1)",
              border: "2px solid rgba(0, 255, 163, 0.45)",
              fontSize: 42,
              fontWeight: 700,
              color: "#00ffa3",
            }}
          >
            {slotText}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#98a69e",
          }}
        >
          <span>로그인 없이 확인하는 공유 일정</span>
          {schedule && typeof schedule.member_count === "number" && schedule.member_count > 0 ? (
            <span>참여 인원 {schedule.member_count}명</span>
          ) : (
            <span>teum</span>
          )}
        </div>
      </div>
    ),
    size
  );
}
