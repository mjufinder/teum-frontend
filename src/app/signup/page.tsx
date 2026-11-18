"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";

import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import AuthFrame from "@/components/layout/AuthFrame";
import { supabase } from "@/lib/supabase";

function getSignupError(code: string | undefined) {
  if (code === "user_already_exists" || code === "email_exists") {
    return "이미 가입된 이메일이에요.";
  }
  if (code === "weak_password") {
    return "비밀번호는 6자 이상이어야 해요.";
  }
  return "회원가입에 실패했어요.";
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(getSignupError("weak_password"));
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(getSignupError(error.code));
      return;
    }
    if (data.session) {
      // 이동 후에도 화면 상태가 유지되므로 돌아왔을 때 비밀번호가 남지 않게 한다.
      setPassword("");
      router.push("/onboarding/profile");
    } else {
      setError("가입은 됐어요. 이메일 확인 후 로그인해 주세요.");
    }
  }

  return (
    <AuthFrame
      title="회원가입"
      description="이메일로 1분 만에 시작해요."
      footer={
        <Text type="supporting">
          이미 계정이 있으신가요? <Link href="/login" type="inherit">로그인</Link>
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
            placeholder="6자 이상"
            description="6자 이상으로 정해 주세요."
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          {error && <Banner status="error" title={error} />}
          <Button type="submit" label="가입하기" variant="primary" size="lg" width="100%" isLoading={loading} />
        </VStack>
      </form>
      <GoogleLoginButton />
    </AuthFrame>
  );
}
