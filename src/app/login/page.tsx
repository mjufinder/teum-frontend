"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { getNextPath } from "@/lib/auth-flow";
import AuthShell, {
  authBtnPrimary,
  authInput,
  authLabel,
  authNotice,
} from "@/components/auth/AuthShell";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
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
    <AuthShell
      title="로그인"
      subtitle="다시 만나서 반가워요."
      footer={
        <>
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-bold text-neon-3 hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
        <label className={authLabel}>
          이메일
          <input
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={authInput}
          />
        </label>
        <label className={authLabel}>
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={authInput}
          />
        </label>
        <button type="submit" disabled={loading} className={authBtnPrimary}>
          {loading ? "처리 중..." : "로그인"}
        </button>
        {error && <p className={authNotice}>{error}</p>}
      </form>
      <div className="mt-6">
        <GoogleLoginButton />
      </div>
    </AuthShell>
  );
}
