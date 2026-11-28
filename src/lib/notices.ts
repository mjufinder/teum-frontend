import { ApiError, apiFetch, authFetch } from "@/lib/api";
import type {
  Notice,
  NoticeComment,
  NoticeCommentListOut,
  NoticeListOut,
} from "@/types/notice";
import type { UserOut } from "@/types/user";

const BASE = "/api/v1/notices";

// 백엔드 입력 제한과 동일하게 맞춘다.
export const NOTICE_TITLE_MAX = 200;
export const NOTICE_CONTENT_MAX = 10000;
export const COMMENT_MAX = 1000;
export const PAGE_SIZE = 20;

export interface NoticeInput {
  title: string;
  content: string;
}

// --- 조회: 비로그인도 가능하므로 공개 호출(apiFetch) ---

/** 공지 목록. 최신순, 페이지네이션. */
export function getNotices(page = 1, pageSize = PAGE_SIZE) {
  return apiFetch<NoticeListOut>(`${BASE}?page=${page}&page_size=${pageSize}`);
}

/** 공지 상세. */
export function getNotice(noticeId: number) {
  return apiFetch<Notice>(`${BASE}/${noticeId}`);
}

/** 공지 댓글 목록. 오래된 순, 페이지네이션. */
export function getComments(noticeId: number, page = 1, pageSize = PAGE_SIZE) {
  return apiFetch<NoticeCommentListOut>(
    `${BASE}/${noticeId}/comments?page=${page}&page_size=${pageSize}`
  );
}

// --- 공지 쓰기: 관리자(ADMIN)만 ---

export function createNotice(body: NoticeInput) {
  return authFetch<Notice>(BASE, { method: "POST", body: JSON.stringify(body) });
}

/** 바꾼 필드만 보낸다(부분 수정). */
export function updateNotice(noticeId: number, body: Partial<NoticeInput>) {
  return authFetch<Notice>(`${BASE}/${noticeId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** 서버에서 논리 삭제로 처리된다. */
export function deleteNotice(noticeId: number) {
  return authFetch<void>(`${BASE}/${noticeId}`, { method: "DELETE" });
}

// --- 댓글 쓰기: 작성은 로그인 사용자, 수정·삭제는 작성자 본인 ---

export function createComment(noticeId: number, content: string) {
  return authFetch<NoticeComment>(`${BASE}/${noticeId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function updateComment(noticeId: number, commentId: number, content: string) {
  return authFetch<NoticeComment>(`${BASE}/${noticeId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export function deleteComment(noticeId: number, commentId: number) {
  return authFetch<void>(`${BASE}/${noticeId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

// --- 보조 ---

/** 로그인 상태면 사용자 정보, 비로그인이면 null. 공지는 비로그인 조회가 허용되므로 401을 null로 흡수한다. */
export async function getMeOrNull(): Promise<UserOut | null> {
  try {
    return await authFetch<UserOut>("/api/v1/auth/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export function isAdmin(user: UserOut | null): boolean {
  return user?.role === "ADMIN";
}

/**
 * 작성자 표시 이름. 현재 백엔드는 author_user_id(숫자)만 내려주므로,
 * 본인은 "나", 그 외에는 "사용자 #id"로 표기한다.
 * (백엔드에 author_name 이 추가되면 이 함수만 교체하면 된다)
 */
export function authorLabel(authorUserId: number, me: UserOut | null): string {
  if (me && me.user_id === authorUserId) return "나";
  return `사용자 #${authorUserId}`;
}

/** ISO 시각을 "방금 전 / N분 전 / N시간 전 / N일 전 / YYYY.MM.DD" 로. */
export function formatWhen(iso: string): string {
  const then = new Date(iso);
  const diffMin = Math.floor((Date.now() - then.getTime()) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const y = then.getFullYear();
  const m = String(then.getMonth() + 1).padStart(2, "0");
  const d = String(then.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

/** 작성 이후 1초 넘게 지난 수정이 있으면 수정된 글로 본다. */
export function isEdited(createdAt: string, updatedAt: string): boolean {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;
}

/** 최근 3일 안에 올라온 글이면 NEW로 본다. */
export function isNew(createdAt: string): boolean {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return days >= 0 && days < 3;
}

/** 정확한 날짜·시각 문자열(툴팁용). 예: 2026.11.28 22:45 */
export function formatExact(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 목록용 짧은 날짜. 올해면 "11.28", 지난 해면 "25.11.28". */
export function formatShort(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const md = `${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  return d.getFullYear() === new Date().getFullYear()
    ? md
    : `${String(d.getFullYear()).slice(2)}.${md}`;
}
