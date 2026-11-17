import { authFetch } from "@/lib/api";
import type { Ballot, Tally, VoteRequest } from "@/types/vote";

function setPath(meetingId: string, setId: number) {
  return `/api/v1/meetings/${meetingId}/candidate-sets/${setId}`;
}

// 1인 1표. 다시 제출하면 기존 투표가 갱신된다. OPEN 묶음만 가능 (아니면 409)
export function submitVote(meetingId: string, setId: number, body: VoteRequest) {
  return authFetch<Ballot>(`${setPath(meetingId, setId)}/vote`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getTally(meetingId: string, setId: number) {
  return authFetch<Tally>(`${setPath(meetingId, setId)}/tally`);
}

// 관리자만. 마감 후 최종 집계를 돌려준다.
export function closeVote(meetingId: string, setId: number) {
  return authFetch<Tally>(`${setPath(meetingId, setId)}/close`, { method: "POST" });
}
