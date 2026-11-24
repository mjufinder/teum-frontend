"use client";

import SiteHeader from "@/components/layout/SiteHeader";

/* 로그인·회원가입 공용 스타일 (테마 토큰 ink/neon 사용) */
export const authLabel = "flex flex-col gap-2 text-sm font-bold text-ink-text-2";
export const authInput =
  "h-12 w-full rounded-[10px] border border-ink-line-2 bg-ink-base px-4 text-[0.95rem] text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/30";
export const authBtnPrimary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-neon text-[0.95rem] font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-50";
export const authBtnGhost =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-ink-line-2 bg-transparent text-[0.95rem] font-bold text-ink-text transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50";
export const authNotice =
  "rounded-[10px] border-l-2 border-live bg-ink-2 px-4 py-3 text-sm text-ink-text-2";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-ink-base text-ink-text-2">
      {/* 배경: 네온 글로우 + 미세 도트 그리드 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-[-14%] left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-neon/10 blur-[130px]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(var(--c-ink-3) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 55% at 50% 0%, #000 35%, transparent 80%)",
            maskImage:
              "radial-gradient(ellipse 65% 55% at 50% 0%, #000 35%, transparent 80%)",
            opacity: 0.5,
          }}
        />
      </div>

      <SiteHeader />

      {/* 중앙 카드 */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pt-20 pb-16">
        <div className="w-full max-w-[26rem]">
          <div className="rounded-[18px] border border-ink-line bg-ink-1/85 p-7 shadow-[0_12px_48px_rgba(0,0,0,0.14)] backdrop-blur-sm md:p-8">
            <div className="mb-7 flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.1em] text-ink-text-3 uppercase">
                <span aria-hidden className="size-1.5 rounded-full bg-neon" />
                finder · 공강 찾기
              </span>
              <h1 className="text-[1.8rem] leading-tight font-bold tracking-[-0.02em] text-ink-text">
                {title}
              </h1>
              <p className="text-sm text-ink-text-3">{subtitle}</p>
            </div>
            {children}
          </div>
          <div className="mt-6 text-center text-sm text-ink-text-3">
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
