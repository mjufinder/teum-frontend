"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import Logo from "@/components/layout/Logo";
import { ApiError } from "@/lib/api";
import { getNextPath } from "@/lib/auth-flow";
import { isMemberAddedButNotMatched } from "@/lib/candidates";
import {
  clearPendingInvite,
  formatInviteExpiry,
  getInvitePreview,
  joinByInvite,
  savePendingInvite,
} from "@/lib/invites";
import type { InvitePreview } from "@/types/invite";

// ready: 참가 가능, login: 로그인 필요, onboarding: 프로필·시간표 등록 필요
type Step = { kind: "ready" } | { kind: "login" } | { kind: "onboarding"; path: string };

function InviteJoin() {
  const router = useRouter();
  const { code } = useParams<{ code: string }>();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const summary = await getInvitePreview(code);
        if (cancelled) return;
        setPreview(summary);
      } catch (e) {
        if (cancelled) return;
        clearPendingInvite();
        if (e instanceof ApiError && e.status === 410) {
          setLoadError("만료된 초대 링크예요. 모임 관리자에게 새 링크를 요청해 주세요.");
        } else if (e instanceof ApiError && e.status === 404) {
          setLoadError("유효하지 않은 초대 링크예요. 링크를 보낸 사람에게 다시 확인해 주세요.");
        } else {
          setLoadError("초대 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
        return;
      }

      let next: string;
      try {
        next = await getNextPath();
      } catch (e) {
        if (cancelled) return;
        // 탈퇴한 계정 등 백엔드가 거절한 세션은 로그인부터 다시 하게 한다.
        next = e instanceof ApiError && e.status === 401 ? "/login" : "";
        if (!next) {
          setLoadError(e instanceof ApiError ? e.message : "서버에 연결하지 못했어요.");
          return;
        }
      }
      if (cancelled) return;

      if (next === "/meetings") {
        // 보관해 둔 코드는 이 화면으로 돌아오는 데 썼으니 지운다. (다음 접속 때 다시 끌려오지 않게)
        clearPendingInvite();
        setStep({ kind: "ready" });
        return;
      }
      // 로그인·온보딩을 마치면 이 페이지로 돌아오도록 코드를 보관한다.
      savePendingInvite(code);
      setStep(next === "/login" ? { kind: "login" } : { kind: "onboarding", path: next });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleJoin() {
    setJoinError(null);
    setJoining(true);
    try {
      const result = await joinByInvite(code);
      clearPendingInvite();
      router.replace(`/meetings/${result.meeting_id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        savePendingInvite(code);
        router.replace("/login");
        return;
      }
      if (e instanceof ApiError && (e.status === 404 || e.status === 410)) {
        clearPendingInvite();
      }
      // 등록은 됐지만 추천 계산만 실패한 경우에는 같은 버튼으로 다시 시도하면 계산만 다시 한다.
      setJoinError(
        isMemberAddedButNotMatched(e)
          ? "참가는 됐지만 추천 시간을 갱신하지 못했어요. 다시 눌러 주세요."
          : e instanceof ApiError
            ? e.message
            : "참가하지 못했어요."
      );
      setJoining(false);
    }
  }

  if (loadError) {
    return <p className="notice notice-danger">{loadError}</p>;
  }

  if (!preview || !step) {
    return <p className="text-sm text-muted">불러오는 중...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">모임 초대</span>
        <h1 className="page-title">{preview.meeting_name}</h1>
        {preview.description && <p className="text-muted">{preview.description}</p>}
        <p className="text-sm">
          지금 <span className="font-bold">{preview.member_count}명</span>이 함께하고 있어요.
        </p>
      </div>

      {step.kind === "ready" && (
        <button type="button" onClick={handleJoin} disabled={joining} className="btn btn-primary">
          {joining ? "참가하는 중..." : "이 모임에 참가하기"}
        </button>
      )}

      {step.kind === "login" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">틈에 로그인하면 바로 참가할 수 있어요.</p>
          <Link href="/login" className="btn btn-primary">
            로그인하고 참가하기
          </Link>
          <Link href="/signup" className="btn btn-secondary">
            처음이에요, 회원가입
          </Link>
        </div>
      )}

      {step.kind === "onboarding" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            추천 시간에 반영되도록 프로필과 시간표를 먼저 등록해 주세요. 마치면 이 화면으로 돌아와요.
          </p>
          <Link href={step.path} className="btn btn-primary">
            등록하러 가기
          </Link>
        </div>
      )}

      {joinError && <p className="notice notice-danger">{joinError}</p>}
      <p className="text-xs text-muted">{formatInviteExpiry(preview.expires_at)}까지 유효한 링크예요.</p>
    </div>
  );
}

// 초대 링크·QR 로 들어오는 공개 페이지 (MEET-08). 로그인 전에도 어떤 모임인지 보여 준다.
export default function InvitePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-5 py-12">
      <Link href="/" aria-label="틈 처음 화면" className="self-start">
        <Logo />
      </Link>
      <div className="card">
        <Suspense fallback={<p className="text-sm text-muted">불러오는 중...</p>}>
          <InviteJoin />
        </Suspense>
      </div>
    </main>
  );
}
