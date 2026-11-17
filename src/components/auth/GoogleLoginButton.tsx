"use client";

import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import { isGoogleLoginEnabled, signInWithGoogle } from "@/lib/auth-flow";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

// 구글 계정으로 로그인·가입 (Supabase OAuth). 처음 로그인하면 온보딩으로 이어진다.
export default function GoogleLoginButton() {
  const [enabled, setEnabled] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isGoogleLoginEnabled().then(setEnabled);
  }, []);

  async function handleClick() {
    setError(null);
    setRedirecting(true);
    const err = await signInWithGoogle();
    // 성공하면 구글 화면으로 이동하므로 실패했을 때만 여기로 돌아온다.
    if (err) {
      setError("구글 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setRedirecting(false);
    }
  }

  return (
    <VStack gap={3}>
      <Divider label="또는" />
      <Button
        label="Google 계정으로 계속하기"
        variant="secondary"
        size="lg"
        width="100%"
        icon={<GoogleMark />}
        onClick={handleClick}
        isLoading={redirecting}
        isDisabled={!enabled}
      />
      {!enabled && (
        <Text type="supporting">
          지금은 구글 로그인을 쓸 수 없어요. 이메일로 로그인해 주세요.
        </Text>
      )}
      {error && (
        <Text type="supporting" color="inherit" className="text-[var(--color-text-error)]">
          {error}
        </Text>
      )}
    </VStack>
  );
}
