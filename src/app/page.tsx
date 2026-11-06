"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Logo from "@/components/layout/Logo";
import { ApiError } from "@/lib/api";
import { getNextPath } from "@/lib/auth-flow";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setChecking(false);
        return;
      }

      try {
        const path = await getNextPath();
        if (!cancelled) router.replace(path);
      } catch (e) {
        if (cancelled) return;
        if (!(e instanceof ApiError && e.status === 401)) {
          setError(e instanceof ApiError ? e.message : "서버에 연결하지 못했어요.");
        }
        setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-muted">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex w-full max-w-xl flex-col items-center gap-6">
        <Logo size="lg" />
        <span className="badge badge-accent px-3 py-1">
          팀 회의 시간 찾기
        </span>
        <h1 className="text-[clamp(2rem,6vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em]">
          시간표만 넣으면
          <br />
          함께 비는 틈을 찾아요
        </h1>
        <p className="text-[1.0625rem] leading-[1.65] text-muted">
          팀원 시간표로 공강을 찾아 회의 시간을 정해요.
        </p>
        <div className="card mt-2 flex w-full flex-col gap-3 sm:flex-row">
          <Link href="/login" className="btn btn-primary flex-1">
            로그인
          </Link>
          <Link href="/signup" className="btn btn-secondary flex-1">
            회원가입
          </Link>
        </div>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted">
          {["이미지로 시간표 등록", "드래그로 바로 수정", "이메일로 팀원 추가"].map((label) => (
            <li key={label} className="flex items-center gap-1.5">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 text-brand-strong"
              >
                <path d="m5 12 5 5 9-10" />
              </svg>
              {label}
            </li>
          ))}
        </ul>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </main>
  );
}
