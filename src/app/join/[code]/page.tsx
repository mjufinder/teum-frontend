"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { getInvitePreview, joinByInviteCode, type InvitePreviewOut } from "@/lib/meetings";
import { supabase } from "@/lib/supabase";

type Phase = "loading" | "preview" | "joining" | "done" | "error";

function JoinContent() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [preview, setPreview] = useState<InvitePreviewOut | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
  }, []);

  useEffect(() => {
    getInvitePreview(code)
      .then((data) => {
        setPreview(data);
        setPhase("preview");
      })
      .catch(() => {
        setErrorMsg("유효하지 않은 초대 링크예요.");
        setPhase("error");
      });
  }, [code]);

  async function handleJoin() {
    if (!loggedIn) {
      router.push(`/login?redirect=/join/${code}`);
      return;
    }
    setPhase("joining");
    try {
      await joinByInviteCode(code);
      setPhase("done");
      setTimeout(() => router.replace("/meetings"), 1800);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        router.replace("/meetings");
        return;
      }
      setErrorMsg(e instanceof ApiError ? e.message : "참가에 실패했어요. 다시 시도해 주세요.");
      setPhase("error");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-base px-4">
      <div className="w-full max-w-sm">
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="size-10 animate-spin rounded-full border-4 border-ink-line border-t-neon" />
            <p className="text-sm text-ink-text-3">초대 링크 확인 중...</p>
          </div>
        )}

        {(phase === "preview" || phase === "joining") && preview && (
          <div className="flex flex-col gap-6 rounded-[20px] border border-ink-line bg-ink-1 p-7 shadow-xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-neon/15 text-neon">
                <Users className="size-7" />
              </span>
              <div>
                <p className="text-xs font-semibold text-neon">모임 초대</p>
                <h1 className="mt-1 text-xl font-bold text-ink-text">{preview.name}</h1>
                {preview.description && (
                  <p className="mt-1.5 text-sm text-ink-text-3">{preview.description}</p>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-line-2 bg-ink-base px-3 py-1 text-xs text-ink-text-2">
                <Users className="size-3.5" />
                현재 {preview.member_count}명 참여 중
              </span>
            </div>

            {loggedIn === false && (
              <p className="rounded-[10px] bg-ink-2 px-4 py-2.5 text-center text-xs text-ink-text-3">
                참가하려면 로그인이 필요해요.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleJoin}
                disabled={phase === "joining"}
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-neon text-sm font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:opacity-50"
              >
                {phase === "joining"
                  ? "참가 중..."
                  : loggedIn === false
                    ? "로그인하고 참가하기"
                    : "모임 참가하기"}
              </button>
              <Link
                href="/"
                className="inline-flex h-9 w-full items-center justify-center rounded-full border border-ink-line-2 text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2"
              >
                취소
              </Link>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-4 rounded-[20px] border border-neon/40 bg-ink-1 p-10 text-center shadow-xl">
            <span className="grid size-14 place-items-center rounded-full bg-neon/15 text-2xl text-neon">
              ✓
            </span>
            <div>
              <p className="text-lg font-bold text-ink-text">참가 완료!</p>
              <p className="mt-1 text-sm text-ink-text-3">내 모임 페이지로 이동할게요.</p>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-4 rounded-[20px] border border-ink-line bg-ink-1 p-10 text-center shadow-xl">
            <span className="text-3xl">🔗</span>
            <div>
              <p className="text-base font-bold text-ink-text">{errorMsg}</p>
              <p className="mt-1 text-sm text-ink-text-3">초대 링크를 다시 확인해 주세요.</p>
            </div>
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-full border border-ink-line-2 px-5 text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2"
            >
              홈으로
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-ink-base">
          <div className="size-10 animate-spin rounded-full border-4 border-ink-line border-t-neon" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
