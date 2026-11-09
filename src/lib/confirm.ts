import { apiFetch, authFetch } from "@/lib/api";
import type { ConfirmResult, PublicSchedule, ShareLink } from "@/types/vote";

// 관리자만. 확정 직전 재검사에 실패하면 confirmed=false 로 사유를 돌려준다. 이미 확정이면 409
export function confirmSchedule(meetingId: string, candidateId: number) {
  return authFetch<ConfirmResult>(`/api/v1/meetings/${meetingId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ candidate_id: candidateId }),
  });
}

// 관리자만. 부를 때마다 새 토큰을 발급하므로 이전 링크는 더 이상 열리지 않는다
export function issueShareLink(meetingId: string) {
  return authFetch<ShareLink>(`/api/v1/meetings/${meetingId}/share`, { method: "POST" });
}

export function shareUrl(token: string) {
  return `${window.location.origin}/share/${token}`;
}

// 로그인 없이 조회 (VOTE-04)
export function getSharedSchedule(token: string) {
  return apiFetch<PublicSchedule>(`/api/v1/share/${encodeURIComponent(token)}`);
}
