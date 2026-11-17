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
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        또는
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!enabled || redirecting}
        className="btn btn-secondary w-full"
      >
        {redirecting ? "구글로 이동 중..." : "Google 계정으로 계속하기"}
      </button>
      {!enabled && (
        <p className="text-xs text-muted">
          지금은 구글 로그인을 쓸 수 없어요. 이메일로 로그인해 주세요.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
