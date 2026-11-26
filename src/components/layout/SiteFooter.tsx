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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-5 py-4 md:gap-10 md:px-8 md:py-12">
        <div className="hidden grid-cols-1 gap-10 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* 브랜드 소개 */}
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 font-bold text-white transition-opacity hover:opacity-90"
            >
              <BrandMark light className="h-6 w-9" />
              <span className="text-lg tracking-tight">틈</span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white/90 uppercase">
                TEUM
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-white/80">
              에브리타임 시간표를 바탕으로 팀원 모두의 공강을 찾고, 투표로 첫 회의 시간까지 가장 빠르게 결정하는 캠퍼스 일정 매칭 서비스입니다.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/70">
              <span className="rounded-full border border-white/20 px-2.5 py-0.5">
                finder · 팀프로젝트 5팀
              </span>
              <span className="rounded-full border border-white/20 px-2.5 py-0.5">
                KST (Asia/Seoul)
              </span>
            </div>
          </div>

          {/* 바로가기 링크 */}
          <div className="grid grid-cols-3 gap-8">
            <div className="flex flex-col gap-2.5">
              <h2 className="text-xs font-bold tracking-wide text-white uppercase">서비스</h2>
              <ul className="flex flex-col gap-2 text-xs text-white/75">
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

            <div className="flex flex-col gap-2.5">
              <h2 className="text-xs font-bold tracking-wide text-white uppercase">내 계정</h2>
              <ul className="flex flex-col gap-2 text-xs text-white/75">
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

            <div className="flex flex-col gap-2.5">
              <h2 className="text-xs font-bold tracking-wide text-white uppercase">정보</h2>
              <ul className="flex flex-col gap-2 text-xs text-white/75">
                <li>명지대 팀플</li>
                <li>finder · 5팀</li>
                <li>공강 매칭</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 하단 Copyright 바 (모바일에서는 컴팩트하게 가운데 정렬만 표시) */}
        <div className="flex flex-col items-center justify-center gap-1 text-center text-[11px] text-white/80 md:flex-row md:justify-between md:border-t md:border-white/15 md:pt-6 md:text-left md:text-white/70">
          <p>© 2026 TEUM (틈) · finder 팀프로젝트 5팀. All rights reserved.</p>
          <p className="hidden md:block">Built for Campus Teams</p>
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
