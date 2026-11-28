"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import NoticeForm from "@/components/notice/NoticeForm";
import TeumLoader from "@/components/layout/TeumLoader";
import { getMeOrNull, isAdmin } from "@/lib/notices";

type Gate = "loading" | "ok" | "denied";

export default function NewNoticePage() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("loading");

  useEffect(() => {
    getMeOrNull()
      .then((me) => {
        if (!me) {
          router.replace("/login");
          return;
        }
        setGate(isAdmin(me) ? "ok" : "denied");
      })
      .catch(() => setGate("denied"));
  }, [router]);

  if (gate === "loading") return <TeumLoader />;

  if (gate === "denied") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-base font-bold text-ink-text">접근 권한이 없어요</p>
        <p className="text-sm text-ink-text-3">공지 작성은 관리자만 할 수 있어요.</p>
        <Link
          href="/notices"
          className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-ink-line px-4 text-sm font-semibold text-ink-text-2 transition-colors hover:border-ink-line-2 hover:text-ink-text"
        >
          <ArrowLeft className="size-4" />
          목록으로
        </Link>
      </div>
    );
  }

  return <NoticeForm />;
}
