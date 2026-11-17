"use client";

import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";

import { LogoMark } from "@/components/layout/Logo";
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

interface AppFrameProps {
  children: React.ReactNode;
  // 로그인한 화면의 메뉴. 온보딩처럼 메뉴가 없어야 하면 false
  hasNav?: boolean;
  // 제목 옆(메뉴 자리)에 넣을 내용. 온보딩 단계 표시 등
  center?: React.ReactNode;
  homeHref?: string;
}

// 로그인 이후 화면의 공통 틀: 위쪽 메뉴와 본문
export default function AppFrame({
  children,
  hasNav = true,
  center,
  homeHref = "/meetings",
}: AppFrameProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AppShell
      contentPadding={0}
      style={{ minHeight: "100dvh" }}
      topNav={
        <TopNav
          label="주 메뉴"
          heading={<TopNavHeading heading="틈" headingHref={homeHref} logo={<LogoMark />} />}
          startContent={
            hasNav ? (
              <>
                {links.map((link) => (
                  <TopNavItem
                    key={link.href}
                    label={link.label}
                    href={link.href}
                    isSelected={isActive(pathname, link.href)}
                  />
                ))}
              </>
            ) : undefined
          }
          centerContent={center}
          endContent={<Button label="로그아웃" variant="ghost" size="sm" onClick={logout} />}
        />
      }
    >
      <main className="mx-auto w-full max-w-[1040px] px-5 py-8 sm:px-6 sm:py-10">{children}</main>
    </AppShell>
  );
}
