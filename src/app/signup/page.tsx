"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import Logo from "@/components/layout/Logo";
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
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-5 py-12">
      <Link href="/" aria-label="틈 처음 화면" className="self-start">
        <Logo />
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="page-title">회원가입</h1>
        <p className="text-sm text-muted">이메일로 1분 만에 시작해요.</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="card flex w-full flex-col gap-5"
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
            autoComplete="new-password"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? "처리 중..." : "가입하기"}
        </button>
        {error && <p className="notice notice-danger">{error}</p>}
      </form>
      <GoogleLoginButton />
      <Link href="/login" className="text-link self-start text-sm">
        이미 계정이 있으신가요? 로그인
      </Link>
    </main>
  );
}
