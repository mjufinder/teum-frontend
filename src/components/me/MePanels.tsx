"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Check,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getNextMeetingOccurrence } from "@/lib/ics";
import { toHHMM } from "@/lib/meetings";
import { supabase } from "@/lib/supabase";
import type { Meeting } from "@/types/meeting";

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

export function MeAvatar({ name }: { name: string }) {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-neon/15 text-2xl font-bold text-neon ring-2 ring-neon/35">
      {initial}
    </div>
  );
}

/* ───────────────── #2 참여 중인 모임 · 확정 일정 대시보드 + #10 리마인더 ───────────────── */

export function MeMeetingsPanel({
  meetings,
  hasTimetable,
}: {
  meetings: Meeting[];
  hasTimetable: boolean;
}) {
  const confirmedList = useMemo(() => {
    return meetings
      .filter((m) => Boolean(m.confirmed_schedule))
      .map((m) => {
        const c = m.confirmed_schedule!;
        const occ = getNextMeetingOccurrence(c.day_of_week, c.start_time, c.end_time);
        return { meeting: m, confirmed: c, occ };
      })
      .sort((a, b) => a.occ.diffDays - b.occ.diffDays);
  }, [meetings]);

  const recalcCount = meetings.filter((m) => m.needs_recalc).length;

  return (
    <div className="flex flex-col gap-5">
      {/* #10 새 학기 / 시간표 최신화 리마인더 */}
      <div className="flex flex-col justify-between gap-3 rounded-[16px] border border-neon/35 bg-neon/8 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-neon" />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-ink-text">
              {hasTimetable
                ? "새 학기나 일정 변동이 있다면 시간표를 최신화해 주세요"
                : "아직 시간표가 등록되지 않았어요"}
            </p>
            <p className="text-[11px] text-ink-text-3">
              최신 시간표가 반영되어야 모든 모임의 공강 매칭이 정확하게 계산돼요.
            </p>
          </div>
        </div>
        <Link
          href="/me/timetable"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-neon px-3.5 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2"
        >
          시간표 확인
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* 모임 통계 3열 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[14px] border border-ink-line bg-ink-1 p-4">
          <p className="text-[11px] text-ink-text-3">참여 모임</p>
          <p className="mt-1 text-xl font-bold text-ink-text tabular-nums">{meetings.length}개</p>
        </div>
        <div className="rounded-[14px] border border-ink-line bg-ink-1 p-4">
          <p className="text-[11px] text-ink-text-3">확정 일정</p>
          <p className="mt-1 text-xl font-bold text-neon tabular-nums">{confirmedList.length}개</p>
        </div>
        <div className="rounded-[14px] border border-ink-line bg-ink-1 p-4">
          <p className="text-[11px] text-ink-text-3">재계산 필요</p>
          <p className="mt-1 text-xl font-bold text-ink-text tabular-nums">{recalcCount}개</p>
        </div>
      </div>

      {/* 확정된 모임 일정 목록 */}
      <section className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-neon" />
            <h2 className="text-sm font-bold text-ink-text">확정된 모임 일정</h2>
          </div>
          <Link href="/meetings" className="text-xs font-semibold text-neon hover:underline">
            전체 모임 보기 →
          </Link>
        </div>

        {confirmedList.length === 0 ? (
          <p className="py-4 text-xs text-ink-text-3">
            아직 확정된 모임 일정이 없어요. 모임 상세에서 투표 후 일정을 확정해 보세요.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {confirmedList.map(({ meeting, confirmed, occ }) => {
              const dDay = occ.isOngoing
                ? "진행 중"
                : occ.diffDays === 0
                  ? "오늘"
                  : `D-${occ.diffDays}`;
              return (
                <Link
                  key={meeting.meeting_id}
                  href={`/meetings/${meeting.meeting_id}`}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-ink-line bg-ink-base px-4 py-3 transition-colors hover:border-neon/50 hover:bg-ink-2/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-text">{meeting.name}</p>
                    <p className="mt-0.5 text-xs text-ink-text-3 tabular-nums">
                      매주 {DAY_NAMES[confirmed.day_of_week] ?? ""}요일{" "}
                      {toHHMM(confirmed.start_time)}–{toHHMM(confirmed.end_time)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-neon/15 px-2.5 py-0.5 text-[11px] font-bold text-neon tabular-nums">
                    {dDay}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 진행 중인 모임 요약 */}
      {meetings.length > 0 && (
        <section className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 p-5">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-neon" />
            <h2 className="text-sm font-bold text-ink-text">최근 참여 모임</h2>
          </div>
          <div className="flex flex-col gap-2">
            {meetings.slice(0, 4).map((m) => (
              <Link
                key={m.meeting_id}
                href={`/meetings/${m.meeting_id}`}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-ink-line bg-ink-base/70 px-3.5 py-2.5 text-xs transition-colors hover:bg-ink-2"
              >
                <span className="truncate font-semibold text-ink-text">{m.name}</span>
                <span className="shrink-0 text-[11px] text-ink-text-3">
                  {m.confirmed_schedule
                    ? "확정 완료"
                    : m.needs_recalc
                      ? "재계산 필요"
                      : "조율 중"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ───────────────── #3 연동 배지 + #8 비밀번호/세션 + #9 탈퇴 ───────────────── */

export function MeSecurityPanel({
  provider,
  email,
  withdrawing,
  withdrawError,
  onOpenWithdraw,
  onSignedOut,
}: {
  provider: string;
  email: string | null;
  withdrawing: boolean;
  withdrawError: string | null;
  onOpenWithdraw: () => void;
  onSignedOut: () => void;
}) {
  const isGoogle = provider === "google";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("비밀번호가 서로 일치하지 않아요.");
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPwMessage("비밀번호를 변경했어요.");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "비밀번호를 변경하지 못했어요.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSignOutAll() {
    setSigningOutAll(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
      onSignedOut();
    } finally {
      setSigningOutAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* #3 로그인 연동 계정 */}
      <section className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-neon" />
            <h2 className="text-sm font-bold text-ink-text">로그인 연동 정보</h2>
          </div>
          <span className="rounded-full bg-neon/15 px-2.5 py-0.5 text-[11px] font-bold text-neon">
            {isGoogle ? "Google 연동" : "이메일 계정"}
          </span>
        </div>
        <p className="text-xs text-ink-text-3">
          {email ? `${email} 계정으로 로그인되어 있어요.` : "현재 세션이 활성화되어 있어요."}
        </p>
      </section>

      {/* #8 비밀번호 재설정 (이메일 계정 전용) */}
      {!isGoogle && (
        <section className="flex flex-col gap-4 rounded-[16px] border border-ink-line bg-ink-1 p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-neon" />
            <h2 className="text-sm font-bold text-ink-text">비밀번호 변경</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)"
              className="h-10 w-full rounded-[10px] border border-ink-line-2 bg-ink-base px-3.5 text-xs text-ink-text placeholder:text-ink-text-weak focus:border-neon focus:outline-none"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 확인"
              className="h-10 w-full rounded-[10px] border border-ink-line-2 bg-ink-base px-3.5 text-xs text-ink-text placeholder:text-ink-text-weak focus:border-neon focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pwSaving || !newPassword || !confirmPassword}
                className="inline-flex h-9 items-center rounded-full bg-neon px-4 text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:opacity-45"
              >
                {pwSaving ? "변경 중..." : "비밀번호 변경"}
              </button>
              {pwMessage && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-neon">
                  <Check className="size-3.5" />
                  {pwMessage}
                </span>
              )}
              {pwError && <p className="text-xs text-live">{pwError}</p>}
            </div>
          </form>
        </section>
      )}

      {/* #8 전체 세션 로그아웃 */}
      <section className="flex flex-col justify-between gap-3 rounded-[16px] border border-ink-line bg-ink-1 p-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-text">
            <LogOut className="size-4 text-neon" />
            전체 기기 로그아웃
          </span>
          <p className="text-xs text-ink-text-3">
            다른 브라우저나 모바일에 로그인된 세션을 포함해 모두 로그아웃해요.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOutAll}
          disabled={signingOutAll}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-ink-line-2 px-4 text-xs font-bold text-ink-text transition-colors hover:bg-ink-2 disabled:opacity-50"
        >
          {signingOutAll ? "로그아웃 중..." : "전체 로그아웃"}
        </button>
      </section>

      {/* #9 위험 구역 (2단계 확인 모달 연결) */}
      <section className="flex flex-col justify-between gap-4 rounded-[16px] border border-live/30 bg-live/[0.04] p-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-live">
            <AlertTriangle className="size-4" />
            회원 탈퇴
          </span>
          <p className="text-xs leading-relaxed text-ink-text-3">
            탈퇴하면 시간표와 모임 참여 기록이 모두 삭제되며 복구할 수 없어요.
          </p>
          {withdrawError && <p className="mt-1 text-xs text-live">{withdrawError}</p>}
        </div>
        <button
          type="button"
          onClick={onOpenWithdraw}
          disabled={withdrawing}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-live/50 px-4 text-xs font-bold text-live transition-colors hover:bg-live/10 disabled:opacity-50"
        >
          {withdrawing ? "처리 중..." : "회원 탈퇴"}
        </button>
      </section>
    </div>
  );
}

/* ───────────────── #9 회원 탈퇴 2단계 텍스트 확인 모달 ───────────────── */

export function WithdrawConfirmModal({
  open,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const canConfirm = typed.trim() === "탈퇴";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-[16px] border border-live/40 bg-ink-base p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-1.5">
          <h3 id="withdraw-modal-title" className="text-base font-bold text-live">
            정말 탈퇴하시겠어요?
          </h3>
          <p className="text-xs leading-relaxed text-ink-text-3">
            모든 프로필·시간표·모임 데이터가 영구 삭제됩니다. 계속하려면 아래 입력란에{" "}
            <strong className="text-ink-text">탈퇴</strong> 를 입력해 주세요.
          </p>
        </div>

        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="탈퇴 입력"
          aria-label="탈퇴 확인 문구 입력"
          className="h-10 w-full rounded-[10px] border border-ink-line-2 bg-ink-1 px-3.5 text-xs text-ink-text placeholder:text-ink-text-weak focus:border-live focus:outline-none"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-[8px] border border-ink-line-2 px-3.5 text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy || !canConfirm}
            onClick={onConfirm}
            className="inline-flex h-9 items-center rounded-[8px] bg-live px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "처리 중..." : "영구 탈퇴"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TimetableMiniCard({
  classHours,
  manualHours,
  freePercent,
  classPercent,
  manualPercent,
  registered,
}: {
  classHours: number;
  manualHours: number;
  freePercent: number;
  classPercent: number;
  manualPercent: number;
  registered: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-text">
          <CalendarClock className="size-3.5 text-neon" />
          시간표 상태
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            registered ? "bg-neon/15 text-neon" : "bg-ink-2 text-ink-text-3"
          }`}
        >
          {registered ? "등록됨" : "미등록"}
        </span>
      </div>

      {registered ? (
        <div className="flex flex-col gap-2">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-ink-base">
            <div style={{ width: `${classPercent}%` }} className="bg-neon" />
            <div style={{ width: `${manualPercent}%` }} className="bg-neon/40" />
          </div>
          <p className="text-[11px] text-ink-text-3 tabular-nums">
            수업 {classHours}h · 개인 {manualHours}h · 공강{" "}
            <strong className="text-neon">{freePercent}%</strong>
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-ink-text-3">시간표를 등록해 공강 매칭에 참여하세요.</p>
      )}

      <Link
        href="/me/timetable"
        className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-full border border-ink-line-2 bg-ink-base text-[11px] font-bold text-ink-text transition-colors hover:border-neon/50 hover:bg-ink-2"
      >
        {registered ? "시간표 편집" : "시간표 등록"}
        <ArrowRight className="size-3 text-neon" />
      </Link>
    </div>
  );
}
