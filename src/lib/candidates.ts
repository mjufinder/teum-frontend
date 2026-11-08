import { ApiError, authFetch } from "@/lib/api";
import type { CandidateSet } from "@/types/candidate";

// 아직 계산된 후보 묶음이 없으면(404) null 을 돌려준다.
export async function getCandidates(meetingId: string) {
  try {
    return await authFetch<CandidateSet>(`/api/v1/meetings/${meetingId}/candidates`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
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
