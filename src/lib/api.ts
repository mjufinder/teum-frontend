/**
 * FastAPI 백엔드 호출용 공용 fetch 래퍼.
 * NEXT_PUBLIC_API_BASE_URL 로 백엔드 주소를 지정합니다. (기본: http://localhost:8000)
 */
import { supabase } from "./supabase";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  // 서버가 보낸 detail 원본. 문자열이 아닌 객체로 추가 정보를 줄 때가 있다.
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function getDefaultMessage(status: number) {
  if (status === 401) return "로그인이 필요해요.";
  if (status === 403) return "권한이 없어요.";
  if (status === 404) return "찾을 수 없어요.";
  if (status >= 500) return "서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.";
  return "요청을 처리하지 못했어요.";
}

async function toApiError(res: Response) {
  let detail: unknown;
  try {
    ({ detail } = await res.json());
  } catch {
    // JSON이 아닌 응답은 상태 코드별 기본 문장을 쓴다.
  }
  let message = getDefaultMessage(res.status);
  if (typeof detail === "string") {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = "입력값을 확인해 주세요.";
  } else if (
    detail &&
    typeof detail === "object" &&
    typeof (detail as { message?: unknown }).message === "string"
  ) {
    // 예: 팀원 추가 후 추천 계산 실패 시 { message, member_added, needs_recalc }
    message = (detail as { message: string }).message;
  }
  return new ApiError(res.status, message, detail);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // FormData는 브라우저가 boundary를 포함한 Content-Type을 직접 넣는다.
  const contentType: Record<string, string> =
    options.body instanceof FormData ? {} : { "Content-Type": "application/json" };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...contentType,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw await toApiError(res);
  }

  // 204 No Content 대응
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/**
 * 로그인(Supabase 세션)이 필요한 백엔드 API 호출.
 * 현재 세션의 access_token 을 Authorization: Bearer 로 자동 첨부한다.
 */
export async function authFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new ApiError(401, "로그인이 필요해요.");
  }

  return apiFetch<T>(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

export { API_BASE_URL };
