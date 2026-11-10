import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 개발 초기 단계에서는 경고만 출력합니다. .env.local 설정 후 사라집니다.
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요."
  );
}

// 구글 로그인(OAuth)에서 돌아온 주소는 클라이언트가 토큰을 읽은 뒤 곧바로 지운다.
// 지워지기 전에 첫 주소를 기억해 두고, 첫 화면이 한 번만 꺼내 쓴다 (consumeOAuthReturn).
export const initialAuthUrl =
  typeof window === "undefined"
    ? null
    : { hash: window.location.hash, search: window.location.search };

/**
 * 브라우저/서버 공용 Supabase 클라이언트.
 * 소셜 로그인, DB 조회 등에 사용합니다.
 */
export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);
