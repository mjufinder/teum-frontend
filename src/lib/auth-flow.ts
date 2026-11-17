import type { Session } from "@supabase/supabase-js";

import { ApiError, authFetch } from "@/lib/api";
import { initialAuthUrl, supabase } from "@/lib/supabase";
import type { UserOut } from "@/types/user";

export async function getNextPath(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "/login";

  const user = await authFetch<UserOut>("/api/v1/auth/me");
  if (!user.major?.trim()) return "/onboarding/profile";

  try {
    await authFetch("/api/v1/timetable");
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return "/onboarding/timetable";
    throw e;
  }
  return "/meetings";
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Supabase 에 구글 로그인이 켜져 있는지 확인한다.
// 백엔드 .env 에 구글 OAuth 값이 없으면 꺼져 있다. 확인 자체가 실패하면 켜진 것으로 본다.
export async function isGoogleLoginEnabled() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (!res.ok) return true;
    const settings: { external?: { google?: boolean } } = await res.json();
    return settings.external?.google !== false;
  } catch {
    return true;
  }
}

// 구글 로그인 후에는 Supabase 가 허용한 주소(앱 첫 화면)로 돌아오고, 첫 화면이 다음 단계로 보낸다.
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return error;
}

let oauthReturnConsumed = false;

// 이 페이지가 OAuth 복귀로 열렸는지 한 번만 알려 준다. 아니면 null, 실패해서 돌아왔으면 error 에 사유.
export function consumeOAuthReturn(): { error: string | null } | null {
  if (oauthReturnConsumed || !initialAuthUrl) return null;
  oauthReturnConsumed = true;
  const { hash, search } = initialAuthUrl;
  const fromOAuth = /access_token=|error=/.test(hash) || /[?&](code|error)=/.test(search);
  if (!fromOAuth) return null;
  const params = new URLSearchParams(hash.slice(1) || search);
  const error = params.get("error_description") ?? params.get("error");
  return { error: error ? error.replace(/\+/g, " ") : null };
}

// 주소에 남은 토큰·오류 조각을 지워 새로고침이나 공유 시 다시 처리되지 않게 한다.
export function clearOAuthParams() {
  window.history.replaceState(null, "", window.location.pathname);
}

// OAuth 복귀 직후에는 세션이 조금 늦게 잡힐 수 있어 로그인 이벤트를 잠시 기다린다.
// 세션이 잡히기 전에 백엔드를 부르면 사용자 프로비저닝이 누락될 수 있다.
export async function waitForSession(timeoutMs = 5000): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};
    const timer = setTimeout(() => finish(null), timeoutMs);
    function finish(value: Session | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(value);
    }
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next) finish(next);
    });
    unsubscribe = () => data.subscription.unsubscribe();
    if (settled) unsubscribe();
  });
}
