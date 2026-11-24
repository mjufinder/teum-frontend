"use client";

import {
  CalendarCheck,
  Check,
  Eye,
  Mail,
  Palette,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { authInput } from "@/components/auth/AuthShell";
import {
  AVATAR_TONES,
  type AvatarToneId,
  MeAvatar,
  MeMeetingsPanel,
  MeSecurityPanel,
  TimetableMiniCard,
  WithdrawConfirmModal,
} from "@/components/me/MePanels";
import { ApiError, authFetch } from "@/lib/api";
import { getMeetings } from "@/lib/meetings";
import { supabase } from "@/lib/supabase";
import { TOTAL_SLOTS, slotState } from "@/lib/timetable";
import { getMyTimetable } from "@/lib/timetable-api";
import type { Meeting } from "@/types/meeting";
import type { TimetableBits } from "@/types/timetable";
import type { UserOut } from "@/types/user";

type MeTab = "profile" | "meetings" | "account";

const ME_TABS: { id: MeTab; label: string; icon: typeof UserIcon }[] = [
  { id: "profile", label: "프로필 · 미리보기", icon: UserIcon },
  { id: "meetings", label: "참여 중인 모임", icon: CalendarCheck },
  { id: "account", label: "계정 · 보안", icon: ShieldCheck },
];

const AVATAR_STORAGE_KEY = "teum_avatar_tone";

export default function MePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MeTab>("profile");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [initialName, setInitialName] = useState("");
  const [initialMajor, setInitialMajor] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("email");
  const [avatarTone, setAvatarTone] = useState<AvatarToneId>("neon");
  const [timetable, setTimetable] = useState<TimetableBits | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

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
        const [user, tt, authRes, meetingList] = await Promise.all([
          authFetch<UserOut>("/api/v1/auth/me"),
          getMyTimetable().catch(() => null),
          supabase.auth.getUser().catch(() => null),
          getMeetings().catch(() => [] as Meeting[]),
        ]);
        if (cancelled) return;
        try {
          const savedTone = localStorage.getItem(AVATAR_STORAGE_KEY) as AvatarToneId | null;
          if (savedTone && AVATAR_TONES.some((t) => t.id === savedTone)) {
            setAvatarTone(savedTone);
          }
        } catch {
          // ignore
        }
        setName(user.name);
        setMajor(user.major ?? "");
        setInitialName(user.name);
        setInitialMajor(user.major ?? "");
        setTimetable(tt);
        setMeetings(meetingList);
        setEmail(authRes?.data?.user?.email ?? null);
        setProvider(String(authRes?.data?.user?.app_metadata?.provider ?? "email"));
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
  const nameInvalid = name.trim().length < 2;
  const majorInvalid = major.trim().length < 2;

  // #6 미저장 프로필 변경사항 이탈 경고
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function handleSelectTone(tone: AvatarToneId) {
    setAvatarTone(tone);
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, tone);
    } catch {
      // ignore
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (nameInvalid || majorInvalid) return;
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="h-72 rounded-[16px] bg-ink-1" />
          <div className="h-80 rounded-[16px] bg-ink-1" />
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
          프로필, 참여 중인 모임 현황 및 계정 보안을 관리하세요.
        </p>
      </header>

      {/* #1 좌측 메뉴(15rem) + 우측 콘텐츠 */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          {/* 세로 메뉴 탭 */}
          <nav
            aria-label="내 정보 메뉴"
            className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
          >
            {ME_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-10 shrink-0 items-center gap-2.5 rounded-[10px] px-3.5 text-xs font-bold whitespace-nowrap transition-colors lg:w-full ${
                    active
                      ? "bg-neon/12 text-neon"
                      : "text-ink-text-3 hover:bg-ink-1 hover:text-ink-text"
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 ${active ? "text-neon" : "text-ink-text-weak"}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* 내 시간표 요약 미니 카드 */}
          <TimetableMiniCard
            classHours={ttStats?.classHours ?? 0}
            manualHours={ttStats?.manualHours ?? 0}
            freePercent={ttStats?.freePercent ?? 0}
            classPercent={ttStats?.classPercent ?? 0}
            manualPercent={ttStats?.manualPercent ?? 0}
            registered={Boolean(ttStats)}
          />
        </aside>

        {/* 우측 탭 본문 */}
        <section className="min-w-0">
          {activeTab === "profile" && (
            <div className="flex flex-col gap-5">
              {/* 프로필 아이덴티티 & #3 연동 배지 & #4 아바타 컬러 */}
              <div className="flex flex-col gap-4 rounded-[18px] border border-ink-line bg-ink-1 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <MeAvatar name={name} tone={avatarTone} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-bold text-ink-text">{name || "—"}</p>
                        <span className="rounded-full bg-neon/12 px-2 py-0.5 text-[10px] font-bold text-neon">
                          {provider === "google" ? "Google" : "Email"}
                        </span>
                      </div>
                      <p className="truncate text-sm text-ink-text-3">{major || "전공 미입력"}</p>
                      {email && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-text-3">
                          <Mail className="size-3 text-neon" />
                          {email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* #4 아바타 컬러 팔레트 */}
                  <div className="flex items-center gap-2 rounded-full border border-ink-line bg-ink-base px-3 py-1.5">
                    <Palette className="size-3.5 text-ink-text-3" />
                    <div className="flex items-center gap-1.5">
                      {AVATAR_TONES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTone(t.id)}
                          aria-label={`${t.label} 아바타 테마`}
                          title={t.label}
                          className={`size-4 rounded-full transition-transform ${t.swatchClass} ${
                            avatarTone === t.id
                              ? "scale-110 ring-2 ring-ink-text ring-offset-2 ring-offset-ink-base"
                              : "opacity-65 hover:opacity-100"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* #5 모임 팀원 표시 미리보기 */}
              <div className="flex flex-col gap-2.5 rounded-[16px] border border-ink-line bg-ink-1 p-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-text-3">
                  <Eye className="size-3.5 text-neon" />
                  모임에서 팀원에게 보이는 모습
                </span>
                <div className="flex items-center justify-between gap-3 rounded-[12px] border border-ink-line bg-ink-base px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <MeAvatar name={name} tone={avatarTone} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink-text">
                        {name.trim() || "이름 미입력"}
                      </p>
                      <p className="truncate text-[11px] text-ink-text-3">
                        {major.trim() || "전공 미입력"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      ttStats ? "bg-neon/15 text-neon" : "bg-ink-2 text-ink-text-weak"
                    }`}
                  >
                    {ttStats ? "시간표 등록됨" : "시간표 미등록"}
                  </span>
                </div>
              </div>

              {/* #6 프로필 편집 폼 */}
              <section className="flex flex-col gap-5 rounded-[18px] border border-ink-line bg-ink-1 p-6">
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
                  <label className="flex flex-col gap-1.5 text-xs font-bold text-ink-text-2">
                    이름
                    <input
                      value={name}
                      maxLength={30}
                      onChange={(e) => {
                        setName(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="이름을 입력하세요 (2자 이상)"
                      className={authInput}
                    />
                    {nameInvalid && (
                      <span className="text-[11px] font-normal text-live">
                        이름은 2자 이상 입력해 주세요.
                      </span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs font-bold text-ink-text-2">
                    전공
                    <input
                      value={major}
                      maxLength={30}
                      onChange={(e) => {
                        setMajor(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="예: 컴퓨터공학과"
                      className={authInput}
                    />
                    {majorInvalid && (
                      <span className="text-[11px] font-normal text-live">
                        전공은 2자 이상 입력해 주세요.
                      </span>
                    )}
                  </label>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving || nameInvalid || majorInvalid || !isDirty}
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
            </div>
          )}

          {activeTab === "meetings" && (
            <MeMeetingsPanel meetings={meetings} hasTimetable={Boolean(ttStats)} />
          )}

          {activeTab === "account" && (
            <MeSecurityPanel
              provider={provider}
              email={email}
              withdrawing={withdrawing}
              withdrawError={withdrawError}
              onOpenWithdraw={() => setConfirmWithdraw(true)}
              onSignedOut={() => router.replace("/login")}
            />
          )}
        </section>
      </div>

      <WithdrawConfirmModal
        open={confirmWithdraw}
        busy={withdrawing}
        onConfirm={doWithdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </div>
  );
}
