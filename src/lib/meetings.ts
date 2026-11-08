import { authFetch } from "@/lib/api";
import type { Meeting, Member } from "@/types/meeting";

export const MIN_DURATIONS = [30, 60, 90, 120, 150, 180];
export const DEFAULT_MIN_DURATION = 60;

function formatDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function getMeetings() {
  return authFetch<Meeting[]>("/api/v1/meetings");
}

export function getMeeting(id: string) {
  return authFetch<Meeting>(`/api/v1/meetings/${id}`);
}

export function createMeeting(name: string, minDuration: number) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 6);
  // 백엔드 생성 요청 정리 전까지 고정값을 함께 보낸다
  return authFetch<Meeting>("/api/v1/meetings", {
    method: "POST",
    body: JSON.stringify({
      name,
      min_duration_min: minDuration,
      period_start: formatDate(start),
      period_end: formatDate(end),
      search_start_time: "09:00",
      search_end_time: "22:00",
      travel_buffer_min: 0,
    }),
  });
}

export function updateMeeting(
  id: string,
  body: { name?: string; minDuration?: number }
) {
  return authFetch<Meeting>(`/api/v1/meetings/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.minDuration !== undefined && {
        min_duration_min: body.minDuration,
      }),
    }),
  });
}

export function getMembers(id: string) {
  return authFetch<Member[]>(`/api/v1/meetings/${id}/members`);
}

export function addMember(id: string, email: string) {
  return authFetch<Member>(`/api/v1/meetings/${id}/members`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
