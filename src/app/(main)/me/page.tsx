"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  Mail,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { authInput } from "@/components/auth/AuthShell";
import ConfirmDialog from "@/components/meeting/ConfirmDialog";
import { ApiError, authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { TOTAL_SLOTS, slotState } from "@/lib/timetable";
import { getMyTimetable } from "@/lib/timetable-api";
import type { TimetableBits } from "@/types/timetable";
import type { UserOut } from "@/types/user";

function Avatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-neon/15 text-2xl font-bold text-neon ring-2 ring-neon/30">
      {initial}
    </div>
  );
}

export default function MePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [initialName, setInitialName] = useState("");
  const [initialMajor, setInitialMajor] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableBits | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [user, tt, authRes] = await Promise.all([
          authFetch<UserOut>("/api/v1/auth/me"),
          getMyTimetable().catch(() => null),
          supabase.auth.getUser().catch(() => null),
        ]);
        if (cancelled) return;
        setName(user.name);
        setMajor(user.major ?? "");
        setInitialName(user.name);
        setInitialMajor(user.major ?? "");
        setTimetable(tt);
        setEmail(authRes?.data?.user?.email ?? null);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(e instanceof ApiError ? e.message : "정보를 불러오지 못했어요.");
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const ttStats = useMemo(() => {
    if (!timetable) return null;
    let classSlots = 0;
    let manualSlots = 0;
    for (let i = 0; i < TOTAL_SLOTS; i += 1) {
      const s = slotState(timetable, i);
      if (s === "class") classSlots += 1;
      else if (s === "manual") manualSlots += 1;
    }
    const freeSlots = TOTAL_SLOTS - classSlots - manualSlots;
    return {
      classHours: classSlots * 0.5,
      manualHours: manualSlots * 0.5,
      freeHours: freeSlots * 0.5,
      freePercent: Math.round((freeSlots / TOTAL_SLOTS) * 100),
      classPercent: Math.round((classSlots / TOTAL_SLOTS) * 100),
      manualPercent: Math.round((manualSlots / TOTAL_SLOTS) * 100),
    };
  }, [timetable]);

  const isDirty = name.trim() !== initialName || major.trim() !== initialMajor;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);
    setSaving(true);
    try {
      const user = await authFetch<UserOut>("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), major: major.trim() }),
      });
      setName(user.name);
      setMajor(user.major ?? "");
      setInitialName(user.name);
      setInitialMajor(user.major ?? "");
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setSaveError(err instanceof ApiError ? err.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function doWithdraw() {
    setWithdrawError(null);
    setWithdrawing(true);
    try {
      await authFetch("/api/v1/auth/me", { method: "DELETE" });
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setWithdrawError(e instanceof ApiError ? e.message : "탈퇴하지 못했어요.");
      setConfirmWithdraw(false);
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="h-12 w-48 rounded-lg bg-ink-2" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="h-72 rounded-[20px] bg-ink-1" />
          <div className="h-80 rounded-[20px] bg-ink-1" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <p className="rounded-[12px] border-l-2 border-live bg-ink-1 px-4 py-3 text-sm text-ink-text-2">
        {loadError}
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-44 w-full max-w-[36rem] -translate-x-1/2 rounded-full bg-neon/[0.04] blur-3xl"
      />

      {/* 상단 페이지 헤더 */}
      <header className="relative flex flex-col gap-1.5 border-b border-ink-line pb-5">
        <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.08em] text-ink-text-3 uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-neon" />
          ACCOUNT
        </span>
        <h1 className="text-[1.75rem] leading-[1.25] font-bold tracking-[-0.025em] text-ink-text">
          내 정보
        </h1>
        <p className="text-sm text-ink-text-3">
          프로필과 주간 시간표 상태를 한눈에 관리하세요.
        </p>
      </header>

      {/* 2컬럼 비대칭 워크스페이스 */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* 좌측: 아이덴티티 & 내 시간표 요약 */}
        <aside className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-[20px] border border-ink-line bg-ink-1">
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-4">
                <Avatar name={name} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-ink-text">{name || "—"}</p>
                  <p className="truncate text-sm text-ink-text-3">{major || "전공 미입력"}</p>
                </div>
              </div>

              {email && (
                <div className="flex items-center gap-2 rounded-[10px] bg-ink-base/80 px-3 py-2 text-xs text-ink-text-3">
                  <Mail className="size-3.5 shrink-0 text-neon" />
                  <span className="truncate">{email}</span>
                </div>
              )}
            </div>
          </div>

          {/* 내 시간표 요약 카드 */}
          <div className="flex flex-col gap-4 rounded-[20px] border border-ink-line bg-ink-1 p-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-text">
                <CalendarClock className="size-4 text-neon" />
                내 시간표 현황
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  ttStats ? "bg-neon/15 text-neon" : "bg-ink-2 text-ink-text-3"
                }`}
              >
                {ttStats ? "등록됨" : "미등록"}
              </span>
            </div>

            {ttStats ? (
              <div className="flex flex-col gap-3">
                {/* 3구간 프로그레스 바 */}
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink-base">
                  <div
                    style={{ width: `${ttStats.classPercent}%` }}
                    className="bg-neon"
                    title={`수업 ${ttStats.classHours}시간`}
                  />
                  <div
                    style={{ width: `${ttStats.manualPercent}%` }}
                    className="bg-neon/40"
                    title={`개인 일정 ${ttStats.manualHours}시간`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-[10px] bg-ink-base/70 px-2 py-2">
                    <p className="text-[10px] text-ink-text-3">수업</p>
                    <p className="text-xs font-bold text-ink-text tabular-nums">
                      {ttStats.classHours}h
                    </p>
                  </div>
                  <div className="rounded-[10px] bg-ink-base/70 px-2 py-2">
                    <p className="text-[10px] text-ink-text-3">개인</p>
                    <p className="text-xs font-bold text-ink-text tabular-nums">
                      {ttStats.manualHours}h
                    </p>
                  </div>
                  <div className="rounded-[10px] bg-ink-base/70 px-2 py-2">
                    <p className="text-[10px] text-ink-text-3">공강</p>
                    <p className="text-xs font-bold text-neon tabular-nums">
                      {ttStats.freePercent}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-ink-text-3">
                시간표를 등록하면 모임 공강 계산에 자동으로 참여해요.
              </p>
            )}

            <Link
              href="/me/timetable"
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-ink-line-2 bg-ink-base text-xs font-bold text-ink-text transition-colors hover:border-neon/50 hover:bg-ink-2"
            >
              {ttStats ? "시간표 수정하기" : "시간표 등록하기"}
              <ArrowRight className="size-3.5 text-neon" />
            </Link>
          </div>
        </aside>

        {/* 우측: 프로필 편집 & 위험 구역 */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-5 rounded-[20px] border border-ink-line bg-ink-1 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="size-4 text-neon" />
                <h2 className="text-base font-bold text-ink-text">프로필 편집</h2>
              </div>
              {isDirty && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neon">
                  <Sparkles className="size-3" />
                  변경사항 있음
                </span>
              )}
            </div>

            <form onSubmit={saveProfile} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-xs font-bold text-ink-text-2">
                이름
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="이름을 입력하세요"
                  className={authInput}
                />
              </label>

              <label className="flex flex-col gap-2 text-xs font-bold text-ink-text-2">
                전공
                <input
                  value={major}
                  onChange={(e) => {
                    setMajor(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="예: 컴퓨터공학과"
                  className={authInput}
                />
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving || !name.trim() || !major.trim() || !isDirty}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-neon px-6 text-sm font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saving ? "저장 중..." : "변경사항 저장"}
                </button>
                {saved && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neon">
                    <Check className="size-4" />
                    저장했어요.
                  </span>
                )}
                {saveError && <p className="text-xs text-live">{saveError}</p>}
              </div>
            </form>
          </section>

          {/* 위험 구역 */}
          <section className="flex flex-col justify-between gap-4 rounded-[20px] border border-live/30 bg-live/[0.04] p-6 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-live">
                <AlertTriangle className="size-4" />
                회원 탈퇴
              </span>
              <p className="text-xs leading-relaxed text-ink-text-3">
                탈퇴하면 시간표와 모임 참여 기록이 삭제되며 복구할 수 없어요.
              </p>
              {withdrawError && <p className="mt-1 text-xs text-live">{withdrawError}</p>}
            </div>
            <button
              type="button"
              onClick={() => setConfirmWithdraw(true)}
              disabled={withdrawing}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-live/50 px-5 text-xs font-bold text-live transition-colors hover:bg-live/10 disabled:opacity-50"
            >
              {withdrawing ? "처리 중..." : "회원 탈퇴"}
            </button>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmWithdraw}
        title="정말 탈퇴하시겠어요?"
        description="탈퇴하면 모든 시간표 및 프로필 정보가 삭제되며 다시 복구할 수 없어요."
        confirmLabel="탈퇴하기"
        tone="danger"
        busy={withdrawing}
        onConfirm={doWithdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </div>
  );
}
