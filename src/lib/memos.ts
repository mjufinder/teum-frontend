import { authFetch } from "@/lib/api";
import type { Memo } from "@/types/memo";

export const MEMO_MAX_LENGTH = 500;

// 서버는 순서를 보장하지 않으므로 최신 메모가 위로 오게 정렬한다.
export async function getMemos(meetingId: string) {
  const memos = await authFetch<Memo[]>(`/api/v1/meetings/${meetingId}/memos`);
  return [...memos].sort((a, b) => b.memo_id - a.memo_id);
}

export function createMemo(meetingId: string, content: string) {
  return authFetch<Memo>(`/api/v1/meetings/${meetingId}/memos`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// 작성자 본인 또는 모임 관리자만 가능 (아니면 403)
export function updateMemo(meetingId: string, memoId: number, content: string) {
  return authFetch<Memo>(`/api/v1/meetings/${meetingId}/memos/${memoId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export function deleteMemo(meetingId: string, memoId: number) {
  return authFetch<void>(`/api/v1/meetings/${meetingId}/memos/${memoId}`, {
    method: "DELETE",
  });
}
