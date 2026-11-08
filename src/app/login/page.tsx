"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { getNextPath } from "@/lib/auth-flow";
import Logo from "@/components/layout/Logo";
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-12">
      <Link href="/" aria-label="틈 처음 화면">
        <Logo />
      </Link>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="page-title">로그인</h1>
        <p className="text-sm text-muted">다시 만나서 반가워요.</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="card flex w-full max-w-sm flex-col gap-5"
      >
        <label className="field-label">
          이메일
          <input
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
        </label>
        <label className="field-label">
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? "처리 중..." : "로그인"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
      <Link href="/signup" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
        계정이 없으신가요? 회원가입
      </Link>
    </main>
  );
}
