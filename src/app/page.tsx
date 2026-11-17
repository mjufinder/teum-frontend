"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import OverlapDemo from "@/components/landing/OverlapDemo";
import Logo from "@/components/layout/Logo";
import { PageLoading } from "@/components/layout/PageState";
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
    return <PageLoading />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-4 sm:px-6">
        <Logo />
        <HStack gap={2}>
          <Button label="로그인" variant="ghost" href="/login" />
          <Button label="시작하기" variant="primary" href="/signup" />
        </HStack>
      </header>
      <main className="mx-auto grid w-full max-w-[1120px] flex-1 items-center gap-10 px-5 py-8 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 lg:py-14">
        <VStack gap={6}>
          <VStack gap={4}>
            <Heading level={1} type="display-2" textWrap="balance">
              팀원 시간표를 겹치면 모두가 비는 시간이 보여요
            </Heading>
            <Text type="large" color="secondary" as="p" display="block">
              에브리타임 시간표 이미지를 올리거나 칸을 칠해 등록하면, 모임에 들어온 팀원 모두의
              빈 시간에서 회의 시간을 골라 투표할 수 있어요.
            </Text>
          </VStack>
          <HStack gap={3} wrap="wrap">
            <Button label="시간표로 시작하기" variant="primary" size="lg" href="/signup" />
            <Button label="로그인" variant="secondary" size="lg" href="/login" />
          </HStack>
          {error && <Banner status="error" title={error} />}
          <Text type="supporting" as="p" display="block">
            옆의 시간표는 직접 눌러 볼 수 있는 예시예요. 팀원을 빼거나 칸을 눌러 내 일정을 바꿔
            보세요.
          </Text>
        </VStack>
        <OverlapDemo />
      </main>
    </div>
  );
}
