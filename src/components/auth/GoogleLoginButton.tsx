"use client";

import { useEffect, useState } from "react";

import { isGoogleLoginEnabled, signInWithGoogle } from "@/lib/auth-flow";

// 구글 계정으로 로그인·가입 (Supabase OAuth). 처음 로그인하면 온보딩으로 이어진다.
export default function GoogleLoginButton() {
  const [enabled, setEnabled] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isGoogleLoginEnabled().then(setEnabled);
  }, []);

  async function handleClick() {
    setError(null);
    setRedirecting(true);
    const err = await signInWithGoogle();
    // 성공하면 구글 화면으로 이동하므로 실패했을 때만 여기로 돌아온다.
    if (err) {
      setError("구글 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setRedirecting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        className="flex items-center gap-3 text-xs text-ink-text-weak"
        aria-hidden
      >
        <span className="h-px flex-1 bg-ink-line" />
        또는
        <span className="h-px flex-1 bg-ink-line" />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!enabled || redirecting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-ink-line-2 bg-transparent text-[0.95rem] font-bold text-ink-text transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
          />
        </svg>
        {redirecting ? "구글로 이동 중..." : "Google 계정으로 계속하기"}
      </button>
      {!enabled && (
        <p className="text-xs text-ink-text-weak">
          지금은 구글 로그인을 쓸 수 없어요. 이메일로 로그인해 주세요.
        </p>
      )}
      {error && <p className="text-sm text-live">{error}</p>}
    </div>
  );
}
