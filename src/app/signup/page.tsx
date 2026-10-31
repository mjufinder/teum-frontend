"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase";

/** 임시 회원가입 페이지 (이메일/비밀번호). 소셜 로그인은 추후 추가 예정. */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    // 이메일 확인 비활성(로컬) → 바로 세션 발급됨. 온보딩으로 이동.
    if (data.session) {
      router.push("/me");
    } else {
      setError("가입은 됐지만 세션이 없습니다. 이메일 확인이 필요한 설정일 수 있어요.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">회원가입</h1>
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
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "처리 중..." : "가입하기"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
      <a href="/login" className="text-sm text-gray-500 underline">
        이미 계정이 있으신가요? 로그인
      </a>
    </main>
  );
}
