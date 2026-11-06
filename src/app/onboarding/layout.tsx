"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Logo from "@/components/layout/Logo";
import { supabase } from "@/lib/supabase";

const steps = [
  { href: "/onboarding/profile", label: "프로필" },
  { href: "/onboarding/timetable", label: "시간표" },
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
      <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] w-full max-w-3xl items-center gap-4 px-5 py-3">
          <Logo />
          <ol className="flex items-center gap-2 text-sm" aria-label="가입 단계">
            {steps.map((step, index) => {
              const current = pathname === step.href;
              return (
                <li key={step.href} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden className="h-px w-5 bg-line-strong" />}
                  <span
                    aria-current={current ? "step" : undefined}
                    className={`flex items-center gap-1.5 ${
                      current ? "font-bold text-foreground" : "text-muted"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                        current
                          ? "bg-brand-strong text-surface"
                          : "border-[1.5px] border-line-strong text-muted"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface/70 hover:text-foreground"
          >
            로그아웃
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        {ready ? children : <p className="text-sm text-muted">불러오는 중...</p>}
      </main>
    </>
  );
}
