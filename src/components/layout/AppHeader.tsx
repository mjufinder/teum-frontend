"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/meetings" className="text-lg font-semibold text-brand">
          틈
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "whitespace-nowrap font-medium text-brand"
                    : "whitespace-nowrap text-muted hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="whitespace-nowrap text-muted hover:text-foreground"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  );
}
