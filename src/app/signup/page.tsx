"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthShell, {
  authBtnPrimary,
  authInput,
  authLabel,
  authNotice,
} from "@/components/auth/AuthShell";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import TermsModal from "@/components/auth/TermsModal";
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

/** 비밀번호 표시/숨김 아이콘 */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {off ? (
        <>
          <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.6 6.6A18.4 18.4 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          <path d="M2 2l20 20" />
        </>
      ) : (
        <>
          <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const canSubmit =
    agreed && password.length >= 6 && password === passwordConfirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("약관에 동의해야 가입할 수 있어요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
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
      setPasswordConfirm("");
      router.push("/onboarding/profile");
    } else {
      setError("가입은 됐어요. 이메일 확인 후 로그인해 주세요.");
    }
  }

  return (
    <AuthShell
      title="회원가입"
      subtitle="이메일로 1분 만에 시작해요."
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold text-neon-3 hover:underline">
            로그인
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
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="6자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={`${authInput} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-text-3 transition-colors hover:text-ink-text"
            >
              <EyeIcon off={showPw} />
            </button>
          </div>
        </label>

        <label className={authLabel}>
          비밀번호 확인
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="비밀번호 다시 입력"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              className={`${authInput} pr-11 ${
                mismatch ? "border-live focus:border-live focus:ring-live/30" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-text-3 transition-colors hover:text-ink-text"
            >
              <EyeIcon off={showPw} />
            </button>
          </div>
          {mismatch && (
            <span className="text-xs font-bold text-live">
              비밀번호가 일치하지 않아요.
            </span>
          )}
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-text-2 select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-neon"
          />
          <span>
            <span className="font-bold text-neon-3">[필수]</span>{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTerms(true);
              }}
              className="font-bold text-neon-3 underline underline-offset-2 hover:text-neon"
            >
              이용약관
            </button>{" "}
            및 개인정보 수집·이용에 동의합니다.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className={authBtnPrimary}
        >
          {loading ? "처리 중..." : "가입하기"}
        </button>
        {error && <p className={authNotice}>{error}</p>}
      </form>

      <div className="mt-6">
        <GoogleLoginButton />
      </div>

      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
    </AuthShell>
  );
}
