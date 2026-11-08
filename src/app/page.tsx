"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold text-brand">틈</h1>
      <p className="text-sm text-muted">팀원 시간표로 공강을 찾아 회의 시간을 정해요.</p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm hover:bg-zinc-50"
        >
          회원가입
        </Link>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </main>
  );
}
