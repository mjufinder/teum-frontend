"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";

import { ApiError } from "@/lib/api";
import { getNextPath } from "@/lib/auth-flow";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import AuthFrame from "@/components/layout/AuthFrame";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        error.code === "invalid_credentials"
          ? "이메일이나 비밀번호가 맞지 않아요."
          : "로그인에 실패했어요."
      );
      setLoading(false);
      return;
    }

    try {
      const path = await getNextPath();
      // 이동 후에도 화면 상태가 유지되므로 로그아웃하고 돌아왔을 때 비밀번호가 남지 않게 한다.
      setPassword("");
      router.replace(path);
    } catch (err) {
      // 탈퇴한 계정이면 세션을 남기지 않는다.
      if (err instanceof ApiError && err.status === 401) {
        await supabase.auth.signOut();
      }
      setError(err instanceof ApiError ? err.message : "로그인에 실패했어요.");
    }
    setLoading(false);
  }

  return (
    <AuthFrame
      title="로그인"
      description="다시 만나서 반가워요."
      footer={
        <Text type="supporting">
          계정이 없으신가요? <Link href="/signup" type="inherit">회원가입</Link>
        </Text>
      }
    >
      <form onSubmit={handleSubmit}>
        <VStack gap={4}>
          <TextInput
            type="email"
            label="이메일"
            size="lg"
            placeholder="name@example.com"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <TextInput
            type="password"
            label="비밀번호"
            size="lg"
            placeholder="비밀번호"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          {error && <Banner status="error" title={error} />}
          <Button type="submit" label="로그인" variant="primary" size="lg" width="100%" isLoading={loading} />
        </VStack>
      </form>
      <GoogleLoginButton />
    </AuthFrame>
  );
}
