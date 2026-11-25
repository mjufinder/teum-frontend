"use client";

import { Check, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";
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

  const currentIndex = steps.findIndex((s) => pathname === s.href);

  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip bg-ink-base text-ink-text-2">
      {/* 배경: 네온 글로우 + 미세 도트 그리드 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-14%] left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-neon/10 blur-[130px]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(var(--c-ink-3) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 55% at 50% 0%, #000 35%, transparent 80%)",
            maskImage:
              "radial-gradient(ellipse 65% 55% at 50% 0%, #000 35%, transparent 80%)",
            opacity: 0.45,
          }}
        />
      </div>

      <header className="sticky top-0 z-30 border-b border-ink-line bg-ink-base/80 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 md:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              aria-label="틈 처음 화면"
              className="flex shrink-0 items-center gap-1.5 font-bold text-ink-text sm:gap-2"
            >
              <BrandMark className="h-5 w-8 sm:h-6 sm:w-9" />
              <span className="text-base sm:text-lg">틈</span>
            </Link>

            <ol className="flex items-center gap-2 text-xs sm:text-sm" aria-label="가입 단계">
              {steps.map((step, index) => {
                const current = pathname === step.href;
                const completed = currentIndex > index;
                return (
                  <li key={step.href} className="flex items-center gap-2">
                    {index > 0 && (
                      <span
                        aria-hidden
                        className={`h-px w-5 transition-colors sm:w-7 ${
                          completed || current ? "bg-neon/60" : "bg-ink-line-2"
                        }`}
                      />
                    )}
                    <span
                      aria-current={current ? "step" : undefined}
                      className={`flex items-center gap-1.5 whitespace-nowrap ${
                        current
                          ? "font-bold text-ink-text"
                          : completed
                            ? "font-semibold text-neon-3"
                            : "text-ink-text-3"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid size-6 place-items-center rounded-full text-xs font-bold transition-colors ${
                          current
                            ? "bg-neon text-on-neon"
                            : completed
                              ? "border border-neon/40 bg-neon/15 text-neon"
                              : "border border-ink-line-2 bg-ink-1 text-ink-text-3"
                        }`}
                      >
                        {completed ? <Check className="size-3.5" /> : index + 1}
                      </span>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold whitespace-nowrap text-ink-text-3 transition-colors hover:text-ink-text sm:text-sm"
            >
              <LogOut className="size-3.5" aria-hidden />
              로그아웃
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-5 py-10 md:px-8 md:py-12">
        {ready ? (
          children
        ) : (
          <div className="mx-auto flex w-full max-w-lg animate-pulse flex-col gap-4">
            <div className="h-8 w-48 rounded-lg bg-ink-1" />
            <div className="h-72 rounded-[18px] border border-ink-line bg-ink-1/80" />
          </div>
        )}
      </main>
    </div>
  );
}
