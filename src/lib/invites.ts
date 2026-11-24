import { ApiError, apiFetch, authFetch } from "@/lib/api";
import type { Invite, InviteJoinResult, InvitePreview } from "@/types/invite";

// 관리자만. 유효한 초대 링크가 없으면 null
export async function getInvite(meetingId: string) {
  try {
    return await authFetch<Invite>(`/api/v1/meetings/${meetingId}/invite`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// 관리자만. 부를 때마다 새 코드를 발급하므로 이전 링크·QR 은 더 이상 쓸 수 없다 (7일 유효)
export function issueInvite(meetingId: string) {
  return authFetch<Invite>(`/api/v1/meetings/${meetingId}/invite`, { method: "POST" });
}

// 관리자만. 지금 링크·QR 로 더 이상 참가할 수 없게 한다
export function revokeInvite(meetingId: string) {
  return authFetch<void>(`/api/v1/meetings/${meetingId}/invite`, { method: "DELETE" });
}

export function inviteUrl(code: string) {
  return `${window.location.origin}/invite/${code}`;
}

// 로그인 없이 조회. 없는 코드는 404, 만료된 코드는 410
export function getInvitePreview(code: string) {
  return apiFetch<InvitePreview>(`/api/v1/invites/${encodeURIComponent(code)}`);
}

// 이미 구성원이면 already_member=true. 등록 후 추천 계산만 실패하면 503 (같은 요청으로 재시도)
export function joinByInvite(code: string) {
  return authFetch<InviteJoinResult>(`/api/v1/invites/${encodeURIComponent(code)}/join`, {
    method: "POST",
  });
}

// 로그인·회원가입·온보딩을 거치는 동안 초대 코드를 잠시 보관한다.
// 구글 로그인은 다른 주소를 다녀오고, 이메일 확인은 새 탭에서 열릴 수 있어 localStorage 를 쓴다.
const PENDING_KEY = "teum.pendingInvite";
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export function savePendingInvite(code: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ code, savedAt: Date.now() }));
  } catch {
    // 저장소를 못 쓰는 환경이면 링크를 다시 열어 참가하면 된다.
  }
}

export function getPendingInvite(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const { code, savedAt } = JSON.parse(raw) as { code?: unknown; savedAt?: unknown };
    if (
      typeof code !== "string" ||
      typeof savedAt !== "number" ||
      Date.now() - savedAt > PENDING_TTL_MS
    ) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // 무시
  }
}

// 준비를 마치고 내 모임으로 가려던 참이면, 열어 둔 초대 링크로 대신 보낸다.
export function withPendingInvite(path: string) {
  if (path !== "/meetings") return path;
  const code = getPendingInvite();
  return code ? `/invite/${encodeURIComponent(code)}` : path;
}

export function formatInviteExpiry(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}
