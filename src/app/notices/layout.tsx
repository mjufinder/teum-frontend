"use client";

import { useEffect, useState } from "react";

import SiteHeader from "@/components/layout/SiteHeader";
import { supabase } from "@/lib/supabase";

/**
 * 공지사항 영역 레이아웃. (main) 과 달리 로그인을 강제하지 않는다.
 * 비로그인 사용자도 공지·댓글을 볼 수 있어야 하므로, 세션 유무에 따라
 * 헤더의 앱 메뉴(로그인) / 로그인 버튼(비로그인)만 바꿔 보여준다.
 */
export default function NoticesLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setAuthed(Boolean(session)))
      .catch(() => setAuthed(false));
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-ink-base text-ink-text-2">
      <SiteHeader showNav={authed === true} showLogin={authed === false} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-24 pb-16 md:px-8">
        {children}
      </main>
    </div>
  );
}
