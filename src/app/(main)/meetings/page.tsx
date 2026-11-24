"use client";

import {
  ArrowUpDown,
  ChevronRight,
  Clock,
  LayoutGrid,
  LayoutList,
  LogOut,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  RotateCw,
  Search,
  Share2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { getCandidates } from "@/lib/candidates";
import { issueShareLink, shareUrl } from "@/lib/confirm";
import { getMeetings, getMembers, leaveMeeting, toHHMM } from "@/lib/meetings";
import { DAY_LABELS } from "@/lib/timetable";
import { getMyTimetable } from "@/lib/timetable-api";
import type { CandidateSet } from "@/types/candidate";
import type { Meeting, Member } from "@/types/meeting";

type FilterMode = "all" | "confirmed" | "recalc";
type SortMode = "latest" | "name" | "recalc";
type ViewMode = "list" | "grid";

interface MeetingPreview {
  loading: boolean;
  members?: Member[];
  candidateSet?: CandidateSet | null;
}

const PIN_KEY = "teum:pinned_meetings";
const VIEW_KEY = "teum:meetings_view";
const TIMETABLE_BANNER_HIDE_KEY = "teum:hide_timetable_banner_date";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SORT_LABELS: Record<SortMode, string> = {
  latest: "최신순",
  name: "이름순",
  recalc: "재계산 우선",
};

const VOTE_STATUS_LABEL: Record<string, string> = {
  OPEN: "투표 중",
  CLOSED: "투표 마감",
  DISCARDED: "재계산 필요",
};

export default function MeetingsPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("latest");
  const [view, setView] = useState<ViewMode>("list");
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [needsTimetable, setNeedsTimetable] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuBusyId, setMenuBusyId] = useState<number | null>(null);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [previews, setPreviews] = useState<Record<number, MeetingPreview>>({});

  // localStorage 복원
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const rawPins = localStorage.getItem(PIN_KEY);
        if (rawPins) {
          const parsed = JSON.parse(rawPins);
          if (Array.isArray(parsed)) setPinnedIds(parsed.filter((x) => typeof x === "number"));
        }
        const savedView = localStorage.getItem(VIEW_KEY);
        if (savedView === "list" || savedView === "grid") setView(savedView);
        if (localStorage.getItem(TIMETABLE_BANNER_HIDE_KEY) === todayKey()) {
          setBannerDismissed(true);
        }
      } catch {
        /* 무시 */
      }
    });
  }, []);

  const loadMeetings = useCallback(async () => {
    setError(null);
    setRetrying(true);
    try {
      setMeetings(await getMeetings());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "불러오지 못했어요.");
    } finally {
      setRetrying(false);
    }
  }, [router]);

  // 모임 목록 + 내 시간표 등록 여부 확인
  useEffect(() => {
    Promise.resolve().then(() => {
      loadMeetings();
    });

    getMyTimetable()
      .then((tt) => {
        const empty = !tt || (!tt.class_bits.includes("1") && !tt.manual_bits.includes("1"));
        setNeedsTimetable(empty);
      })
      .catch(() => {
        /* 시간표 확인 실패는 배너 미노출로 처리 */
      });
  }, [loadMeetings]);

  // 토스트 자동 숨김
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // 바깥 클릭 시 빠른 액션 메뉴 닫기
  useEffect(() => {
    if (openMenuId === null) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-meeting-menu]")) return;
      setOpenMenuId(null);
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [openMenuId]);

  const recalcCount = useMemo(
    () => meetings?.filter((m) => m.needs_recalc).length ?? 0,
    [meetings]
  );
  const confirmedCount = useMemo(
    () => meetings?.filter((m) => Boolean(m.confirmed_schedule)).length ?? 0,
    [meetings]
  );

  const filtered = useMemo(() => {
    if (!meetings) return [];
    const q = query.trim().toLowerCase();
    const list = meetings.filter((m) => {
      if (filter === "recalc" && !m.needs_recalc) return false;
      if (filter === "confirmed" && !m.confirmed_schedule) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q)
      );
    });

    const pinSet = new Set(pinnedIds);
    return [...list].sort((a, b) => {
      const aPin = pinSet.has(a.meeting_id) ? 0 : 1;
      const bPin = pinSet.has(b.meeting_id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;

      if (sort === "name") return a.name.localeCompare(b.name, "ko");
      if (sort === "recalc" && a.needs_recalc !== b.needs_recalc) {
        return a.needs_recalc ? -1 : 1;
      }
      return b.meeting_id - a.meeting_id;
    });
  }, [meetings, query, filter, sort, pinnedIds]);

  // 키보드 내비게이션: '/', 'N', '↑', '↓', 'Enter', 'Escape'
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Escape") {
        setOpenMenuId(null);
        setFocusedIdx(null);
        if (typing) target?.blur();
        return;
      }

      if (typing) return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/meetings/new");
        return;
      }

      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((prev) => {
          const next = prev === null ? 0 : Math.min(filtered.length - 1, prev + 1);
          itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((prev) => {
          const next = prev === null ? filtered.length - 1 : Math.max(0, prev - 1);
          itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "Enter" && focusedIdx !== null && filtered[focusedIdx]) {
        e.preventDefault();
        router.push(`/meetings/${filtered[focusedIdx].meeting_id}`);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, focusedIdx, router]);

  function togglePin(e: React.MouseEvent, meetingId: number) {
    e.preventDefault();
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(meetingId)
        ? prev.filter((id) => id !== meetingId)
        : [meetingId, ...prev];
      try {
        localStorage.setItem(PIN_KEY, JSON.stringify(next));
      } catch {
        /* 무시 */
      }
      return next;
    });
  }

  function changeView(next: ViewMode) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* 무시 */
    }
  }

  const loadPreview = useCallback(
    async (meetingId: number) => {
      if (previews[meetingId]) return;
      setPreviews((prev) => ({ ...prev, [meetingId]: { loading: true } }));
      const idStr = String(meetingId);
      const [membersRes, candRes] = await Promise.allSettled([
        getMembers(idStr),
        getCandidates(idStr),
      ]);
      setPreviews((prev) => ({
        ...prev,
        [meetingId]: {
          loading: false,
          members: membersRes.status === "fulfilled" ? membersRes.value : undefined,
          candidateSet: candRes.status === "fulfilled" ? candRes.value : undefined,
        },
      }));
    },
    [previews]
  );

  function handleMouseEnter(meetingId: number) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredId(meetingId);
      loadPreview(meetingId);
    }, 220);
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredId(null);
  }

  async function handleCopyShare(e: React.MouseEvent, meetingId: number) {
    e.preventDefault();
    e.stopPropagation();
    setMenuBusyId(meetingId);
    try {
      const { share_token } = await issueShareLink(String(meetingId));
      await navigator.clipboard.writeText(shareUrl(share_token));
      setToast("공유 링크를 복사했어요.");
      setOpenMenuId(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "확정된 일정이 없거나 공유 링크를 만들 수 없어요."
      );
    } finally {
      setMenuBusyId(null);
    }
  }

  async function handleLeave(e: React.MouseEvent, meeting: Meeting) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`'${meeting.name}' 모임에서 나갈까요?`)) return;
    setMenuBusyId(meeting.meeting_id);
    try {
      await leaveMeeting(String(meeting.meeting_id));
      setMeetings((prev) =>
        prev ? prev.filter((item) => item.meeting_id !== meeting.meeting_id) : prev
      );
      setOpenMenuId(null);
      setToast(`'${meeting.name}' 모임에서 나갔어요.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "모임에서 나가지 못했어요.");
    } finally {
      setMenuBusyId(null);
    }
  }

  return (
    <div className="relative flex flex-col gap-6">
      {/* 은은한 상단 네온 글로우 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-44 w-full max-w-[36rem] -translate-x-1/2 rounded-full bg-neon/[0.045] blur-3xl"
      />

      {/* 미등록 시간표 알림 배너 (#7, #9 오늘 그만 보기) */}
      {needsTimetable && !bannerDismissed && (
        <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-neon/35 bg-neon/8 px-4 py-3 text-xs">
          <p className="text-ink-text-2">
            아직 등록된 시간표가 없어요. 시간표를 입력해야 정확한 공강 추천을 받을 수 있어요.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/me/timetable"
              className="inline-flex h-7 shrink-0 items-center rounded-[6px] bg-neon px-3 font-bold text-on-neon transition-colors hover:bg-neon-2"
            >
              시간표 등록하기
            </Link>
            <button
              type="button"
              aria-label="오늘 그만 보기"
              title="오늘 그만 보기"
              onClick={() => {
                setBannerDismissed(true);
                try {
                  localStorage.setItem(TIMETABLE_BANNER_HIDE_KEY, todayKey());
                } catch {
                  /* 무시 */
                }
              }}
              className="grid size-7 place-items-center rounded-[6px] text-ink-text-3 transition-colors hover:bg-ink-2 hover:text-ink-text"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="relative flex flex-col justify-between gap-4 border-b border-ink-line pb-5 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[1.65rem] font-bold tracking-[-0.025em] text-ink-text">
              내 모임
            </h1>
            {meetings && (
              <span className="rounded-md border border-ink-line bg-ink-1 px-2 py-0.5 text-xs font-semibold text-ink-text-3 tabular-nums">
                {meetings.length}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-text-3">
            팀원 시간표로 공강을 찾고 회의 일정을 정하는 모임 목록
          </p>
        </div>

        <Link
          href="/meetings/new"
          title="단축키 N"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[8px] bg-neon px-4 text-sm font-bold text-on-neon shadow-[0_1px_12px_rgba(0,255,163,0.18)] transition-all hover:bg-neon-2"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          새 모임
        </Link>
      </div>

      {/* 토스트 & 에러 */}
      {toast && (
        <div className="rounded-[10px] border border-neon/40 bg-neon/10 px-4 py-2.5 text-xs font-semibold text-neon">
          {toast}
        </div>
      )}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-live/30 bg-live/5 px-4 py-3 text-sm text-live">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            {!meetings && (
              <button
                type="button"
                onClick={loadMeetings}
                disabled={retrying}
                className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-live/40 px-2.5 text-xs font-semibold text-live transition-colors hover:bg-live/10 disabled:opacity-50"
              >
                <RotateCw className={`size-3 ${retrying ? "animate-spin" : ""}`} />
                {retrying ? "불러오는 중" : "다시 시도"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs underline underline-offset-2"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {!error && !meetings && (
        <div className="divide-y divide-ink-line overflow-hidden rounded-[12px] border border-ink-line bg-ink-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-40 animate-pulse rounded bg-ink-3" />
                <div className="h-3.5 w-64 animate-pulse rounded bg-ink-2" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-ink-2" />
            </div>
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {meetings && meetings.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-ink-line-2 bg-ink-1/40 px-6 py-16 text-center">
          <p className="text-base font-bold text-ink-text">아직 참여한 모임이 없어요</p>
          <p className="max-w-sm text-sm text-ink-text-3">
            새 모임을 만들고 팀원을 초대하면 모두의 공강을 자동으로 계산해요.
          </p>
          <Link
            href="/meetings/new"
            className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-neon px-4 text-sm font-bold text-on-neon transition-colors hover:bg-neon-2"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            모임 만들기
          </Link>
        </div>
      )}

      {/* 툴바 + 목록 */}
      {meetings && meetings.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-text-weak" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocusedIdx(null);
                }}
                placeholder="모임 검색..."
                className="h-9 w-full rounded-[8px] border border-ink-line bg-ink-1 pr-9 pl-8 text-sm text-ink-text placeholder:text-ink-text-weak transition-colors focus:border-ink-line-2 focus:outline-none"
              />
              {!query && (
                <kbd
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-ink-line-2 bg-ink-base px-1.5 py-0.5 text-[10px] font-semibold text-ink-text-weak sm:inline-block"
                >
                  /
                </kbd>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* 필터 */}
              <div className="inline-flex items-center rounded-[8px] border border-ink-line bg-ink-1 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-[6px] px-2.5 py-1 transition-colors ${
                    filter === "all"
                      ? "bg-ink-3 text-ink-text"
                      : "text-ink-text-3 hover:text-ink-text"
                  }`}
                >
                  전체 {meetings.length}
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("confirmed")}
                  className={`rounded-[6px] px-2.5 py-1 transition-colors ${
                    filter === "confirmed"
                      ? "bg-ink-3 text-ink-text"
                      : "text-ink-text-3 hover:text-ink-text"
                  }`}
                >
                  확정 {confirmedCount}
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("recalc")}
                  className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 transition-colors ${
                    filter === "recalc"
                      ? "bg-ink-3 text-ink-text"
                      : "text-ink-text-3 hover:text-ink-text"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full ${
                      recalcCount > 0 ? "bg-neon" : "bg-ink-text-weak"
                    }`}
                  />
                  재계산 {recalcCount}
                </button>
              </div>

              {/* 정렬 (#1) */}
              <div className="relative inline-flex items-center">
                <ArrowUpDown className="pointer-events-none absolute left-2.5 size-3 text-ink-text-weak" />
                <select
                  aria-label="정렬 기준"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="h-8 appearance-none rounded-[8px] border border-ink-line bg-ink-1 pr-3 pl-7 text-xs font-semibold text-ink-text-2 transition-colors hover:border-ink-line-2 focus:outline-none"
                >
                  {(Object.keys(SORT_LABELS) as SortMode[]).map((k) => (
                    <option key={k} value={k}>
                      {SORT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              {/* 리스트/카드 뷰 전환 (#3) */}
              <div
                role="group"
                aria-label="보기 방식"
                className="inline-flex items-center rounded-[8px] border border-ink-line bg-ink-1 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => changeView("list")}
                  aria-label="리스트 보기"
                  aria-pressed={view === "list"}
                  className={`grid size-7 place-items-center rounded-[6px] transition-colors ${
                    view === "list"
                      ? "bg-ink-3 text-ink-text"
                      : "text-ink-text-3 hover:text-ink-text"
                  }`}
                >
                  <LayoutList className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => changeView("grid")}
                  aria-label="카드 보기"
                  aria-pressed={view === "grid"}
                  className={`grid size-7 place-items-center rounded-[6px] transition-colors ${
                    view === "grid"
                      ? "bg-ink-3 text-ink-text"
                      : "text-ink-text-3 hover:text-ink-text"
                  }`}
                >
                  <LayoutGrid className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[12px] border border-ink-line bg-ink-1 px-5 py-10 text-center text-sm text-ink-text-3">
              조건에 맞는 모임이 없어요.
            </div>
          ) : (
            <ul
              className={
                view === "grid"
                  ? "grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  : "divide-y divide-ink-line rounded-[12px] border border-ink-line bg-ink-1"
              }
            >
              {filtered.map((m, idx) => {
                const pinned = pinnedIds.includes(m.meeting_id);
                const focused = focusedIdx === idx;
                const menuOpen = openMenuId === m.meeting_id;
                const busy = menuBusyId === m.meeting_id;
                const isHovered = hoveredId === m.meeting_id;
                const preview = previews[m.meeting_id];
                const isFirst = idx === 0;
                const isLast = idx === filtered.length - 1;

                return (
                  <li
                    key={m.meeting_id}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    onMouseEnter={() => handleMouseEnter(m.meeting_id)}
                    onMouseLeave={handleMouseLeave}
                    className={
                      view === "grid"
                        ? `relative flex flex-col rounded-[12px] border transition-colors ${
                            focused
                              ? "border-neon/60 bg-ink-2"
                              : "border-ink-line bg-ink-1 hover:border-ink-line-2 hover:bg-ink-2"
                          }`
                        : `relative transition-colors ${
                            isFirst ? "rounded-t-[12px]" : ""
                          } ${isLast ? "rounded-b-[12px]" : ""} ${
                            focused ? "bg-ink-2 ring-1 ring-inset ring-neon/60" : "hover:bg-ink-2"
                          }`
                    }
                  >
                    <Link
                      href={`/meetings/${m.meeting_id}`}
                      className={
                        view === "grid"
                          ? "group flex min-h-[10.5rem] flex-col justify-between gap-4 p-4"
                          : "group relative flex min-h-[4.75rem] items-center justify-between gap-4 px-5 py-4"
                      }
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => togglePin(e, m.meeting_id)}
                            aria-label={pinned ? "고정 해제" : "상단 고정"}
                            aria-pressed={pinned}
                            className={`grid size-6 shrink-0 place-items-center rounded transition-colors ${
                              pinned
                                ? "text-neon"
                                : "text-ink-text-weak opacity-60 hover:bg-ink-3 hover:text-ink-text group-hover:opacity-100"
                            }`}
                          >
                            <Pin className={`size-3.5 ${pinned ? "fill-neon/25" : ""}`} />
                          </button>

                          <span className="truncate text-[0.95rem] font-bold text-ink-text transition-colors group-hover:text-neon">
                            {m.name}
                          </span>

                          {m.confirmed_schedule && (
                            <span className="shrink-0 rounded border border-neon/40 bg-neon/10 px-1.5 py-0.5 text-[0.68rem] font-bold text-neon tabular-nums">
                              확정 · {DAY_LABELS[m.confirmed_schedule.day_of_week]}{" "}
                              {toHHMM(m.confirmed_schedule.start_time)}~
                              {toHHMM(m.confirmed_schedule.end_time)}
                            </span>
                          )}

                          {m.needs_recalc && (
                            <span className="shrink-0 rounded border border-neon/40 bg-neon/10 px-1.5 py-0.5 text-[0.68rem] font-bold text-neon">
                              재계산 필요
                            </span>
                          )}
                        </div>

                        <p
                          className={`pl-8 text-sm ${
                            m.description ? "text-ink-text-3" : "text-ink-text-weak"
                          } ${
                            view === "grid"
                              ? "line-clamp-2 min-h-[2.5rem]"
                              : "truncate"
                          }`}
                        >
                          {m.description || "설명이 없어요."}
                        </p>
                      </div>

                      <div
                        className={`flex items-center justify-between gap-3 ${
                          view === "grid" ? "border-t border-ink-line pt-3" : "shrink-0"
                        }`}
                      >
                        <div
                          className={`items-center gap-2 text-xs text-ink-text-3 tabular-nums ${
                            view === "grid" ? "flex flex-wrap" : "hidden md:flex"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1 rounded-md border border-ink-line bg-ink-base px-2 py-1">
                            <Clock className="size-3 text-ink-text-weak" />
                            {m.min_duration_min}분
                          </span>
                          <span className="rounded-md border border-ink-line bg-ink-base px-2 py-1">
                            {toHHMM(m.search_start_time)}–{toHHMM(m.search_end_time)}
                          </span>
                          {m.travel_buffer_min > 0 && (
                            <span className="rounded-md border border-ink-line bg-ink-base px-2 py-1">
                              여유 {m.travel_buffer_min}분
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1" data-meeting-menu>
                          <button
                            type="button"
                            aria-label="모임 메뉴"
                            aria-expanded={menuOpen}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId((prev) =>
                                prev === m.meeting_id ? null : m.meeting_id
                              );
                            }}
                            className="grid size-7 place-items-center rounded-[6px] text-ink-text-3 transition-colors hover:bg-ink-3 hover:text-ink-text"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>

                          {view === "list" && (
                            <ChevronRight className="size-4 text-ink-text-weak transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink-text" />
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* 카드/행 아래로 확장되는 상세 요약 미리보기 (#8) */}
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        isHovered ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div
                          className={`flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-line/70 text-xs ${
                            view === "grid" ? "px-4 py-3" : "px-5 py-3 pl-13"
                          }`}
                        >
                          {!preview || preview.loading ? (
                            <div className="flex w-full items-center gap-4">
                              <div className="h-3.5 w-16 animate-pulse rounded bg-ink-3" />
                              <div className="h-3.5 w-36 animate-pulse rounded bg-ink-3" />
                            </div>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1.5 text-ink-text-2">
                                <Users className="size-3.5 text-ink-text-3" />
                                구성원{" "}
                                <strong className="text-ink-text">
                                  {preview.members ? `${preview.members.length}명` : "—"}
                                </strong>
                              </span>

                              <span className="inline-flex items-center gap-1.5 text-ink-text-2">
                                <Sparkles className="size-3.5 text-neon" />
                                {preview.candidateSet &&
                                preview.candidateSet.candidates.length > 0 ? (
                                  <>
                                    1순위{" "}
                                    <strong className="text-ink-text tabular-nums">
                                      {DAY_LABELS[preview.candidateSet.candidates[0].day_of_week]}
                                      요일 {toHHMM(preview.candidateSet.candidates[0].start_time)}~
                                      {toHHMM(preview.candidateSet.candidates[0].end_time)}
                                    </strong>
                                    <span className="rounded bg-neon/10 px-1.5 py-0.5 text-[10px] font-bold text-neon">
                                      {VOTE_STATUS_LABEL[preview.candidateSet.vote_status] ??
                                        preview.candidateSet.vote_status}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-ink-text-3">추천 시간 없음</span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 빠른 액션 드롭다운 (#9) */}
                    {menuOpen && (
                      <div
                        data-meeting-menu
                        className="absolute top-12 right-4 z-30 flex w-44 flex-col rounded-[10px] border border-ink-line-2 bg-ink-base p-1 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
                      >
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => handleCopyShare(e, m.meeting_id)}
                          className="flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text disabled:opacity-50"
                        >
                          <Share2 className="size-3.5 text-ink-text-3" />
                          공유 링크 복사
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/meetings/${m.meeting_id}/edit`);
                          }}
                          className="flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-xs font-semibold text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text"
                        >
                          <Pencil className="size-3.5 text-ink-text-3" />
                          조건 수정
                        </button>
                        <div className="my-1 border-t border-ink-line" />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => handleLeave(e, m)}
                          className="flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-xs font-semibold text-live transition-colors hover:bg-live/10 disabled:opacity-50"
                        >
                          <LogOut className="size-3.5" />
                          {busy ? "처리 중..." : "모임 나가기"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* 키보드 힌트 */}
          <p className="hidden text-right text-[11px] text-ink-text-weak sm:block">
            <kbd className="rounded border border-ink-line px-1">↑</kbd>{" "}
            <kbd className="rounded border border-ink-line px-1">↓</kbd> 이동 ·{" "}
            <kbd className="rounded border border-ink-line px-1">Enter</kbd> 열기 ·{" "}
            <kbd className="rounded border border-ink-line px-1">N</kbd> 새 모임
          </p>
        </div>
      )}
    </div>
  );
}
