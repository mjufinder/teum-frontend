"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";

/**
 * 전역 공용 헤더. 메인 콘텐츠와 동일한 좌우 여백(max-w-6xl + px).
 * overlay=true 면 최상단에서 배경 없이 투명, 스크롤하면 배경이 스르륵 나타난다.
 */
export default function SiteHeader({
  showLogin = false,
  overlay = false,
}: {
  showLogin?: boolean;
  overlay?: boolean;
}) {
  const [scrolled, setScrolled] = useState(!overlay);

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
    setScrolled(false);
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
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          aria-label="틈 처음 화면"
          className="flex items-center gap-2 font-bold text-ink-text"
        >
          <BrandMark className="h-6 w-9" />
          <span className="text-lg">틈</span>
        </Link>
        <div className="flex items-center gap-2">
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
