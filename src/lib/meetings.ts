import { authFetch } from "@/lib/api";
import { SLOT_COUNT, slotLabel } from "@/lib/timetable";
import type { Meeting, Member } from "@/types/meeting";

export const MIN_DURATIONS = [30, 60, 90, 120, 150, 180];
export const DEFAULT_MIN_DURATION = 60;

// 시간표 격자(09:00~22:00, 30분 단위)와 같은 범위에서만 고르게 한다.
export const SEARCH_TIMES = Array.from({ length: SLOT_COUNT + 1 }, (_, slot) =>
  slotLabel(slot)
);
export const DEFAULT_SEARCH_START = SEARCH_TIMES[0];
export const DEFAULT_SEARCH_END = SEARCH_TIMES[SEARCH_TIMES.length - 1];

export const TRAVEL_BUFFERS = [0, 10, 15, 20, 30];
export const DEFAULT_TRAVEL_BUFFER = 0;

// 백엔드는 "09:00:00" 형태로 돌려주므로 화면과 비교할 때는 앞 5자리만 쓴다.
export function toHHMM(time: string) {
  return time.slice(0, 5);
}

export function toMinutes(time: string) {
  const [hour, minute] = toHHMM(time).split(":").map(Number);
  return hour * 60 + minute;
}

function formatDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export interface MeetingInput {
  name: string;
  description: string | null;
  minDuration: number;
  searchStartTime: string;
  searchEndTime: string;
  travelBufferMin: number;
}

export interface MeetingUpdateBody {
  name?: string;
  description?: string;
  min_duration_min?: number;
  search_start_time?: string;
  search_end_time?: string;
  travel_buffer_min?: number;
}

export function getMeetings() {
  return authFetch<Meeting[]>("/api/v1/meetings");
}

export function getMeeting(id: string) {
  return authFetch<Meeting>(`/api/v1/meetings/${id}`);
}

export function createMeeting(input: MeetingInput) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 6);
  // 기간은 주간(1주) 고정 기준이라 백엔드 생성 요청 정리 전까지 고정값을 보낸다
  return authFetch<Meeting>("/api/v1/meetings", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      min_duration_min: input.minDuration,
      period_start: formatDate(start),
      period_end: formatDate(end),
      search_start_time: input.searchStartTime,
      search_end_time: input.searchEndTime,
      travel_buffer_min: input.travelBufferMin,
    }),
  });
}

export function updateMeeting(id: string, body: MeetingUpdateBody) {
  return authFetch<Meeting>(`/api/v1/meetings/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// 관리자만 가능. 서버에서 Soft Delete 로 처리한다. (MEET-07)
export function deleteMeeting(id: string) {
  return authFetch<void>(`/api/v1/meetings/${id}`, { method: "DELETE" });
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

// 위임 후 바뀐 구성원 목록을 돌려준다. 기존 관리자는 MEMBER 가 된다. (MEET-05)
export function transferAdmin(id: string, targetUserId: number) {
  return authFetch<Member[]>(`/api/v1/meetings/${id}/transfer-admin`, {
    method: "POST",
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
}

// 관리자는 409 로 막힌다. 권한을 넘기거나 모임을 삭제해야 한다. (MEET-05)
export function leaveMeeting(id: string) {
  return authFetch<void>(`/api/v1/meetings/${id}/members/me`, {
    method: "DELETE",
  });
}
