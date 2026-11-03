"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">회원가입</h1>
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
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
        >
          {loading ? "처리 중..." : "가입하기"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
      <Link href="/login" className="text-sm text-muted underline">
        이미 계정이 있으신가요? 로그인
      </Link>
    </main>
  );
}
