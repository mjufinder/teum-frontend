"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

const steps = [
  { href: "/onboarding/profile", label: "1 프로필" },
  { href: "/onboarding/timetable", label: "2 시간표" },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setReady(true);
      } else {
        router.replace("/login");
      }
    }

    check();
    return () => {
      cancelled = true;
      // 숨겨진 라우트의 상태가 유지되므로 다음에 가입한 사용자에게 이전 입력값이 보이지 않게 비운다.
      setReady(false);
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <>
      <header className="border-b border-line bg-surface">
        <ol className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3 text-sm">
          {steps.map((step, index) => (
            <li key={step.href} className="flex items-center gap-2">
              {index > 0 && <span className="text-muted">·</span>}
              <span
                aria-current={pathname === step.href ? "step" : undefined}
                className={pathname === step.href ? "font-medium text-brand" : "text-muted"}
              >
                {step.label}
              </span>
            </li>
          ))}
          <li className="ml-auto">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-muted hover:underline"
            >
              로그아웃
            </button>
          </li>
        </ol>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        {ready ? children : <p className="text-sm text-muted">불러오는 중...</p>}
      </main>
    </>
  );
}
