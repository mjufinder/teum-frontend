"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase";

/** 임시 로그인 페이지 (이메일/비밀번호 + 구글 소셜 로그인). */
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
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/me");
  }

  async function handleGoogle() {
    setError(null);
    // 구글 로그인 → Supabase 콜백 → 로그인 후 /me 로 복귀
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/me` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">로그인</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "처리 중..." : "로그인"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      <div className="flex w-full max-w-sm items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />또는<span className="h-px flex-1 bg-gray-200" />
      </div>
      <button
        onClick={handleGoogle}
        className="flex w-full max-w-sm items-center justify-center gap-2 rounded border px-3 py-2"
      >
        <span>구글로 로그인</span>
      </button>

      <a href="/signup" className="text-sm text-gray-500 underline">
        계정이 없으신가요? 회원가입
      </a>
    </main>
  );
}
