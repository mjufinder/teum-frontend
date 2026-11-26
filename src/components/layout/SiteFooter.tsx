"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import BrandMark from "@/components/layout/BrandMark";

function FooterInner({ forceShow }: { forceShow: boolean }) {
  const pathname = usePathname();
  if (!forceShow && pathname === "/") return null;

  return (
    <footer className="bg-brand text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-7 md:gap-10 md:px-8 md:py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-10">
          {/* 브랜드 소개 */}
          <div className="flex flex-col gap-2 md:gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href="/"
                className="inline-flex w-fit items-center gap-2 font-bold text-white transition-opacity hover:opacity-90"
              >
                <BrandMark light className="h-5 w-8 md:h-6 md:w-9" />
                <span className="text-base tracking-tight md:text-lg">틈</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white/90 uppercase">
                  TEUM
                </span>
              </Link>
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/75 md:hidden">
                finder · 5팀
              </span>
            </div>
            <p className="hidden max-w-sm text-xs leading-relaxed text-white/80 sm:block">
              에브리타임 시간표를 바탕으로 팀원 모두의 공강을 찾고, 투표로 첫 회의 시간까지 가장 빠르게 결정하는 캠퍼스 일정 매칭 서비스입니다.
            </p>
            <p className="text-[11px] text-white/80 sm:hidden">
              시간표 기반 캠퍼스 공강 매칭 · 회의 일정 결정 서비스
            </p>
            <div className="mt-1 hidden flex-wrap items-center gap-2 text-[11px] text-white/70 md:flex">
              <span className="rounded-full border border-white/20 px-2.5 py-0.5">
                finder · 팀프로젝트 5팀
              </span>
              <span className="rounded-full border border-white/20 px-2.5 py-0.5">
                KST (Asia/Seoul)
              </span>
            </div>
          </div>

          {/* 바로가기 링크 */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-[11px] font-bold tracking-wide text-white uppercase md:text-xs">서비스</h2>
              <ul className="flex flex-col gap-1.5 text-[11px] text-white/75 md:gap-2 md:text-xs">
                <li>
                  <Link href="/" className="transition-colors hover:text-white">
                    홈
                  </Link>
                </li>
                <li>
                  <Link href="/meetings" className="transition-colors hover:text-white">
                    내 모임
                  </Link>
                </li>
                <li>
                  <Link href="/meetings/new" className="transition-colors hover:text-white">
                    새 모임 만들기
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[11px] font-bold tracking-wide text-white uppercase md:text-xs">내 계정</h2>
              <ul className="flex flex-col gap-1.5 text-[11px] text-white/75 md:gap-2 md:text-xs">
                <li>
                  <Link href="/me/timetable" className="transition-colors hover:text-white">
                    내 시간표
                  </Link>
                </li>
                <li>
                  <Link href="/me" className="transition-colors hover:text-white">
                    내 정보
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="transition-colors hover:text-white">
                    로그인
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[11px] font-bold tracking-wide text-white uppercase md:text-xs">정보</h2>
              <ul className="flex flex-col gap-1.5 text-[11px] text-white/75 md:gap-2 md:text-xs">
                <li>명지대 팀플</li>
                <li>finder · 5팀</li>
                <li>공강 매칭</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 하단 Copyright 바 */}
        <div className="flex flex-col justify-between gap-1 border-t border-white/15 pt-4 text-[11px] text-white/70 sm:flex-row sm:items-center md:pt-6">
          <p>© 2026 TEUM (틈) · finder 팀프로젝트 5팀.</p>
          <p className="hidden sm:block">Built for Campus Teams</p>
        </div>
      </div>
    </footer>
  );
}

export default function SiteFooter({ forceShow = false }: { forceShow?: boolean }) {
  return (
    <Suspense>
      <FooterInner forceShow={forceShow} />
    </Suspense>
  );
}
