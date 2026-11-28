"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import TeumLoader from "@/components/layout/TeumLoader";
import NoticeForm from "@/components/notice/NoticeForm";
import { ApiError } from "@/lib/api";
import { getMeOrNull, getNotice, isAdmin } from "@/lib/notices";
import type { Notice } from "@/types/notice";

type Gate = "loading" | "ok" | "denied" | "notfound";

function EditNotice() {
  const router = useRouter();
  const params = useParams<{ noticeId: string }>();
  const noticeId = Number(params.noticeId);
  const invalidId = Number.isNaN(noticeId);

  const [gate, setGate] = useState<Gate>("loading");
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (invalidId) return;

    async function prepare() {
      const me = await getMeOrNull();
      if (!me) {
        router.replace("/login");
        return;
      }
      if (!isAdmin(me)) {
        setGate("denied");
        return;
      }
      try {
        setNotice(await getNotice(noticeId));
        setGate("ok");
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          setGate("notfound");
          return;
        }
        setGate("denied");
      }
    }

    prepare();
  }, [invalidId, noticeId, router]);

  const effectiveGate: Gate = invalidId ? "notfound" : gate;

  if (effectiveGate === "loading") return <TeumLoader />;

  if (effectiveGate === "ok" && notice) return <NoticeForm initial={notice} />;

  const message =
    effectiveGate === "notfound"
      ? { title: "공지를 찾을 수 없어요", desc: "이미 삭제되었거나 없는 공지예요." }
      : { title: "접근 권한이 없어요", desc: "공지 수정은 관리자만 할 수 있어요." };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-base font-bold text-ink-text">{message.title}</p>
      <p className="text-sm text-ink-text-3">{message.desc}</p>
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

export default function EditNoticePage() {
  return (
    <Suspense fallback={<TeumLoader />}>
      <EditNotice />
    </Suspense>
  );
}
