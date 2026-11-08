"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import Logo from "@/components/layout/Logo";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/meetings", label: "내 모임" },
  { href: "/me/timetable", label: "내 시간표" },
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
    <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-[72px] w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
        <Link href="/meetings" aria-label="틈 홈">
          <Logo />
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-brand-strong shadow-[var(--shadow-soft)]"
                    : "whitespace-nowrap rounded-full px-3.5 py-2 text-muted transition-colors hover:bg-surface/70 hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="whitespace-nowrap rounded-full px-3.5 py-2 text-muted transition-colors hover:bg-surface/70 hover:text-foreground"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  );
}
