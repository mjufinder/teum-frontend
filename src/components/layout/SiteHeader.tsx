"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { supabase } from "@/lib/supabase";

const navLinks = [
  { href: "/meetings", label: "내 모임" },
  { href: "/me/timetable", label: "내 시간표" },
  { href: "/me", label: "내 정보" },
];

function isActive(pathname: string, href: string) {
  // /me 는 /me/timetable 의 상위 경로라서 정확히 같을 때만 강조한다.
  if (href === "/me") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 전역 공용 헤더. 메인 콘텐츠와 동일한 좌우 여백(max-w-6xl + px).
 * overlay=true 면 최상단에서 배경 없이 투명, 스크롤하면 배경이 스르륵 나타난다.
 * showNav=true 면 로그인 사용자용 앱 메뉴(내 모임·내 시간표·내 정보·로그아웃)를 표시한다.
 */
export default function SiteHeader({
  showLogin = false,
  showNav = false,
  overlay = false,
}: {
  showLogin?: boolean;
  showNav?: boolean;
  overlay?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(!overlay);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  useEffect(() => {
    if (!overlay) return;
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document | null;
      const top =
        t && t !== document && typeof (t as HTMLElement).scrollTop === "number"
          ? (t as HTMLElement).scrollTop
          : window.scrollY;
      setScrolled(top > 8);
    };
    // 캡처 단계로 들어야 내부 스크롤 컨테이너(랜딩 main)의 스크롤도 잡힌다.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [overlay]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        aria-hidden
        className={`absolute inset-0 border-b border-ink-line bg-ink-base/80 backdrop-blur-md transition-opacity duration-300 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-5 md:px-8">
        <Link
          href={showNav ? "/meetings" : "/"}
          aria-label={showNav ? "틈 홈" : "틈 처음 화면"}
          className="flex shrink-0 items-center gap-1.5 font-bold text-ink-text sm:gap-2"
        >
          <BrandMark className="h-5 w-8 sm:h-6 sm:w-9" />
          <span className="text-base sm:text-lg">틈</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
          {showNav && (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <nav
                aria-label="주 메뉴"
                className="flex items-center gap-0.5 rounded-full border border-ink-line bg-ink-1/90 p-1"
              >
                {navLinks.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors sm:px-3.5 sm:py-1.5 sm:text-xs ${
                        active
                          ? "bg-ink-base text-neon shadow-xs ring-1 ring-ink-line"
                          : "text-ink-text-3 hover:text-ink-text"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <span aria-hidden className="hidden h-4 w-px bg-ink-line sm:inline-block" />

              <button
                type="button"
                onClick={logout}
                aria-label="로그아웃"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-transparent px-2 text-[11px] font-semibold whitespace-nowrap text-ink-text-3 transition-colors hover:border-ink-line hover:bg-ink-1 hover:text-ink-text sm:h-9 sm:px-3 sm:text-xs"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          )}
          <ThemeToggle />
          {showLogin && (
            <Link
              href="/login"
              className="rounded-full border border-ink-line-2 px-4 py-1.5 text-sm font-bold text-ink-text-2 transition-colors hover:bg-ink-2"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
