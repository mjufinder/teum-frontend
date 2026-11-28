"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import BrandMark from "@/components/layout/BrandMark";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/meetings", label: "내 모임" },
  { href: "/me/timetable", label: "내 시간표" },
  { href: "/notices", label: "공지사항" },
  { href: "/me", label: "내 정보" },
];

function isActive(pathname: string, href: string) {
  // /me 는 /me/timetable 의 상위 경로라서 정확히 같을 때만 강조한다.
  if (href === "/me") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink-line bg-ink-base/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-end justify-between gap-x-4 px-5 pt-4">
        <Link
          href="/meetings"
          aria-label="틈 홈"
          className="flex items-center gap-2 pb-3 font-bold text-ink-text"
        >
          <BrandMark className="h-6 w-9" />
          <span className="text-lg">틈</span>
        </Link>
        <div className="flex items-end gap-2">
          <nav className="flex flex-wrap items-end text-sm font-bold">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`-mb-px border-b-4 px-3 pt-2 pb-3 whitespace-nowrap transition-colors ${
                    active
                      ? "border-neon text-neon"
                      : "border-transparent text-ink-text-3 hover:border-ink-line-2 hover:text-ink-text"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={logout}
              className="-mb-px border-b-4 border-transparent px-3 pt-2 pb-3 whitespace-nowrap text-ink-text-3 transition-colors hover:text-ink-text"
            >
              로그아웃
            </button>
          </nav>
          <div className="pb-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
