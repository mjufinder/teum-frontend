"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { getNextPath } from "@/lib/auth-flow";
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">로그인</h1>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-line bg-surface p-5"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
        >
          {loading ? "처리 중..." : "로그인"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
      <Link href="/signup" className="text-sm text-muted underline">
        계정이 없으신가요? 회원가입
      </Link>
    </main>
  );
}
