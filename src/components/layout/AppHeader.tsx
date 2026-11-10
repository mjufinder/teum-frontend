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
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-end justify-between gap-x-4 px-5 pt-4">
        <Link href="/meetings" aria-label="틈 홈" className="pb-3">
          <Logo />
        </Link>
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
                    ? "border-brand text-brand"
                    : "border-transparent text-muted hover:border-line hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="-mb-px border-b-4 border-transparent px-3 pt-2 pb-3 whitespace-nowrap text-muted transition-colors hover:text-foreground"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  );
}
