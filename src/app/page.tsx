"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import GapGrid from "@/components/landing/GapGrid";
import Logo from "@/components/layout/Logo";
import { ApiError } from "@/lib/api";
import {
  clearOAuthParams,
  consumeOAuthReturn,
  getNextPath,
  waitForSession,
} from "@/lib/auth-flow";
import { withPendingInvite } from "@/lib/invites";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
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

      try {
        const path = await getNextPath();
        // 초대 링크에서 구글 로그인으로 다녀온 경우 초대 화면으로 돌려보낸다.
        if (!cancelled) router.replace(withPendingInvite(path));
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
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-muted">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[960px] flex-col px-5 py-6">
      <header>
        <Logo />
      </header>
      <div className="grid flex-1 items-center gap-12 py-12 md:grid-cols-[1fr_minmax(0,22rem)] md:gap-16">
        <div className="flex max-w-[30rem] flex-col gap-6">
          <h1 className="text-[clamp(2rem,4.4vw,2.75rem)] leading-[1.22] font-bold tracking-[-0.025em]">
            팀원 시간표를 겹쳐
            <br />
            모두가 비는 시간을 찾아요
          </h1>
          <p className="text-[1.0625rem] text-muted">
            에브리타임 시간표 이미지를 올리거나 칸을 칠해 등록하면, 모임에 들어온 팀원
            모두의 빈 시간에서 회의 시간을 골라 투표할 수 있어요.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">
              시간표로 시작하기
            </Link>
            <Link href="/login" className="btn btn-secondary">
              로그인
            </Link>
          </div>
          {error && <p className="notice notice-danger">{error}</p>}
        </div>
        <GapGrid />
      </div>
    </main>
  );
}
