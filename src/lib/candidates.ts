import { ApiError, authFetch } from "@/lib/api";
import type { CandidateSet, MeetingAvailability } from "@/types/candidate";

// 아직 계산된 후보 묶음이 없으면(404) null 을 돌려준다.
export async function getCandidates(meetingId: string) {
  try {
    return await authFetch<CandidateSet>(`/api/v1/meetings/${meetingId}/candidates`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function getMeetingAvailability(meetingId: string) {
  return authFetch<MeetingAvailability>(`/api/v1/meetings/${meetingId}/availability`);
}

export function addCustomCandidate(
  meetingId: string,
  body: { day_of_week: number; start_time: string; end_time: string }
) {
  return authFetch<CandidateSet>(`/api/v1/meetings/${meetingId}/candidates`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteCustomCandidate(meetingId: string, candidateId: number) {
  return authFetch<CandidateSet>(`/api/v1/meetings/${meetingId}/candidates/${candidateId}`, {
    method: "DELETE",
  });
}

// 팀원은 등록됐지만 추천 계산만 실패한 503 응답인지 확인한다.
export function isMemberAddedButNotMatched(e: unknown) {
  return (
    e instanceof ApiError &&
    e.status === 503 &&
    typeof e.detail === "object" &&
    e.detail !== null &&
    (e.detail as { member_added?: unknown }).member_added === true
  );
}
