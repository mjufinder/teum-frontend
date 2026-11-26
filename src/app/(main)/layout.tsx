"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import SiteHeader from "@/components/layout/SiteHeader";
import TeumLoader from "@/components/layout/TeumLoader";
import { ApiError } from "@/lib/api";
import { getNextPath } from "@/lib/auth-flow";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const path = await getNextPath();
        if (cancelled) return;
        if (path === "/meetings") {
          setReady(true);
        } else {
          router.replace(path);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "서버에 연결하지 못했어요.");
      }
    }

    check();
    return () => {
      cancelled = true;
      // 숨겨진 라우트의 상태가 유지되므로 다음에 로그인한 사용자에게 이전 화면이 보이지 않게 비운다.
      setReady(false);
      setError(null);
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex flex-1 flex-col bg-ink-base text-ink-text-2">
        <SiteHeader showNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-24 pb-12 md:px-8">
          {error ? (
            <p className="rounded-[12px] border-l-2 border-live bg-ink-1 px-4 py-3 text-sm text-ink-text-2">
              {error}
            </p>
          ) : (
            <TeumLoader />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-x-clip bg-ink-base text-ink-text-2">
      <SiteHeader showNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-24 pb-12 md:px-8">{children}</main>
    </div>
  );
}
