"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import LandingStory from "@/components/landing/LandingStory";
import BrandMark from "@/components/layout/BrandMark";
import { ApiError } from "@/lib/api";
import {
  clearOAuthParams,
  consumeOAuthReturn,
  getNextPath,
  waitForSession,
} from "@/lib/auth-flow";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // 구글 로그인(OAuth)에서 돌아온 경우: 실패 사유를 보여 주거나 세션이 잡힐 때까지 기다린다.
      const oauth = consumeOAuthReturn();
      const fromOAuth = oauth !== null;
      const oauthError = oauth?.error ?? null;
      const session = oauthError
        ? null
        : fromOAuth
          ? await waitForSession()
          : (await supabase.auth.getSession()).data.session;
      if (fromOAuth) clearOAuthParams();
      if (cancelled) return;
      if (oauthError) {
        setError("구글 로그인에 실패했어요. 다시 시도해 주세요.");
      }
      if (!session) {
        if (fromOAuth && !oauthError) {
          setError("로그인 정보를 확인하지 못했어요. 다시 시도해 주세요.");
        }
        setChecking(false);
        return;
      }

      if (!fromOAuth) {
        setLoggedIn(true);
        setChecking(false);
        return;
      }

      try {
        const path = await getNextPath();
        if (!cancelled) router.replace(path);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          // 탈퇴한 계정 등 백엔드가 거절한 세션은 남기지 않는다.
          await supabase.auth.signOut();
          if (fromOAuth) setError("이 계정으로는 로그인할 수 없어요. 탈퇴한 계정인지 확인해 주세요.");
        } else {
          setError(e instanceof ApiError ? e.message : "서버에 연결하지 못했어요.");
        }
        setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    const delays = [0, 120, 240, 120, 240, 360, 240, 360, 480];
    return (
      <main
        aria-busy="true"
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink-base p-8"
      >
        {/* 틈(TEUM) 미니 공강 격자 로더 */}
        <div aria-hidden className="grid grid-cols-3 gap-1.5">
          {delays.map((delay, idx) =>
            idx === 4 ? (
              <span
                key={idx}
                style={{ animationDelay: "300ms" }}
                className="teum-loader-gap size-4 rounded-[4px] bg-neon"
              />
            ) : (
              <span
                key={idx}
                style={{ animationDelay: `${delay}ms` }}
                className="teum-loader-cell size-4 rounded-[4px] bg-ink-3"
              />
            )
          )}
        </div>

        <div className="flex items-center gap-2 text-ink-text-2">
          <BrandMark className="h-5 w-8" />
          <span className="text-sm font-bold tracking-tight">틈</span>
        </div>
        <span className="sr-only">불러오는 중...</span>
      </main>
    );
  }

  return <LandingStory error={error} isLoggedIn={loggedIn} />;
}
