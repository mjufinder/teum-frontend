"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import MeshBackground from "@/components/landing/MeshBackground";
import SiteHeader from "@/components/layout/SiteHeader";

/* ───────────────────────── 공통 ───────────────────────── */

/** 뷰에 들어오면 아래에서 떠오른다. */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setShown(true),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** 섹션 머리말 — 네온 점 + 대문자 라벨. */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.8rem] font-bold tracking-[0.08em] text-ink-text-3 uppercase">
      <span aria-hidden className="size-1.5 rounded-full bg-neon" />
      {children}
    </span>
  );
}

const pillPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-neon px-6 text-[0.95rem] font-bold text-on-neon transition-colors hover:bg-neon-2";
const pillGhost =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-ink-line-2 bg-transparent px-6 text-[0.95rem] font-bold text-ink-text transition-colors hover:bg-white/5";

/* ───────────────────────── 히어로 격자 ───────────────────────── */

const DAYS = ["월", "화", "수", "목", "금"];
const HOURS = [10, 11, 12, 13, 14, 15];
const BUSY = [
  [true, false, true, false, true, false],
  [false, true, false, false, false, true],
  [true, false, true, false, true, false],
  [false, true, false, true, false, true],
  [true, false, false, false, true, false],
];
const GAP = { day: 1, hour: 4 }; // 화 14:00

/** 다크 네온 시간표: 회색 면 = 누군가 수업, 네온 = 모두 공강. */
function NeonGrid() {
  let order = 0;
  return (
    <figure className="flex flex-col gap-3 rounded-[16px] border border-ink-line bg-ink-1 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
      <div className="grid grid-cols-[1.75rem_repeat(5,minmax(0,1fr))] gap-[3px]">
        <span />
        {DAYS.map((d) => (
          <span
            key={d}
            className="pb-1 text-center text-[0.7rem] font-bold text-ink-text-3"
          >
            {d}
          </span>
        ))}
        {HOURS.map((h, hi) => (
          <div key={h} className="contents">
            <span className="pr-1 text-right text-[0.65rem] leading-[1.8rem] text-ink-text-weak tabular-nums">
              {h}
            </span>
            {DAYS.map((d, di) => {
              const busy = BUSY[di][hi];
              const isGap = di === GAP.day && hi === GAP.hour;
              const delay = !isGap ? 60 + order++ * 20 : 0;
              // 수업=회색 / 가용=초록·연두 번갈아 / 공통 공강=네온
              const tint = busy
                ? "bg-ink-3"
                : (di + hi) % 2 === 0
                  ? "bg-lime"
                  : "bg-lime-bright";
              return (
                <span
                  key={d}
                  className="relative grid h-7 place-items-center overflow-hidden rounded-[4px] bg-ink-2 text-[0.65rem] font-bold"
                >
                  {!isGap && (
                    <span
                      className={`hero-slot absolute inset-0 ${tint}`}
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  )}
                  {isGap && (
                    <span
                      className="hero-gap absolute inset-0 grid place-items-center bg-neon text-on-neon shadow-[0_0_14px_rgba(0,255,163,0.35)]"
                      style={{ animationDelay: "1050ms" }}
                    >
                      14:00
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <figcaption className="flex items-center justify-between border-t border-ink-line pt-3">
        <span className="text-[0.8rem] font-bold text-ink-text-2">
          화 14:00 — 15:00 · 3명 모두 공강
        </span>
        <span className="flex items-center gap-3 text-[0.65rem] text-ink-text-3">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-[2px] bg-ink-3" /> 수업
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-[2px] bg-lime" /> 가능
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-[2px] bg-neon" /> 공강
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/* ───────────────────────── 데이터 ───────────────────────── */

const STATS = [
  { n: "11", unit: "", label: "도메인 클래스" },
  { n: "182", unit: "bit", label: "시간표 비트맵" },
  { n: "94", unit: "", label: "자동 테스트 통과" },
  { n: "5", unit: "단계", label: "입력부터 확정까지" },
];

const PROBLEMS = [
  { k: "공유", t: "일일이 눈으로 비교", b: "시간표 캡처를 단톡방에 올리고 사람이 직접 겹쳐 봐요." },
  { k: "변경", t: "바뀌면 처음부터 다시", b: "인원이 늘거나 일정이 바뀌면 조율을 매번 반복해요." },
  { k: "결정", t: "찾아도 끝이 아니에요", b: "시간을 찾아도 투표와 공지는 따로 돌려야 해요." },
];

/* ── 뷰 4 : 단계별 아이콘 + 상세 ── */
type IconProps = { className?: string };
function UploadIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 15l5-5 4 4 3-3 6 6" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </svg>
  );
}
function UsersIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function GridIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function VoteIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function ShareIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
    </svg>
  );
}

const STEP_DETAILS: {
  label: string;
  desc: string;
  Icon: (p: IconProps) => React.ReactElement;
}[] = [
  {
    label: "시간표 등록",
    Icon: UploadIcon,
    desc: "에브리타임 시간표 이미지를 올리면 OCR로 수업 시간을 인식해 182비트로 변환합니다. 인식 결과는 격자에서 직접 수정할 수 있어요.",
  },
  {
    label: "모임 참여",
    Icon: UsersIcon,
    desc: "모임을 만들거나 초대로 참여합니다. 관리자·구성원 권한이 구분되고, 참여하는 즉시 공강 계산 대상에 포함돼요.",
  },
  {
    label: "공강 계산",
    Icon: GridIcon,
    desc: "구성원 전원의 가능 시간을 AND 연산으로 겹쳐 공통 공강을 계산합니다. 최소 회의 시간을 넘는 구간만 후보로 남아요.",
  },
  {
    label: "후보 투표",
    Icon: VoteIcon,
    desc: "추천된 Top 3와 차선책 중에서 팀원이 투표로 회의 시간을 고릅니다. 투표는 후보 묶음 단위로 관리돼 서로 섞이지 않아요.",
  },
  {
    label: "확정·공유",
    Icon: ShareIcon,
    desc: "확정 직전에 시간표를 다시 검사해 변경을 반영한 뒤 일정을 확정하고, 결과를 조회·공유할 수 있어요.",
  },
];

/** 단계 스테퍼: hover 시 미리보기, 클릭 시 고정. 다른 단계로 가면 전환된다. */
function FlowSteps() {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? 0;
  const d = STEP_DETAILS[active];

  const count = STEP_DETAILS.length;

  return (
    <div className="mt-14">
      {/* 타임라인: 원형 번호 + 연결선 + 아래 라벨 */}
      <ol className="relative grid grid-cols-5 gap-1">
        <span
          aria-hidden
          className="absolute top-[18px] right-[10%] left-[10%] h-0.5 rounded-full bg-ink-line-2"
        />
        {STEP_DETAILS.map((s, i) => {
          const on = active === i;
          return (
            <li key={s.label}>
              <button
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group flex w-full flex-col items-center gap-3 text-center"
              >
                <span
                  className={`relative grid size-9 place-items-center rounded-full text-sm font-bold tabular-nums ring-4 ring-ink transition-all ${
                    on
                      ? "scale-110 bg-neon text-on-neon shadow-[0_0_16px_rgba(0,255,163,0.4)]"
                      : "bg-ink-3 text-ink-text-2 group-hover:bg-ink-line-2"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-[0.82rem] font-bold transition-colors sm:text-[0.9rem] ${
                    on ? "text-ink-text" : "text-ink-text-3"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* 하단 말풍선 — 활성 단계 상세 (화살표가 해당 단계를 가리킴) */}
      <div className="relative mt-7">
        <span
          aria-hidden
          className="absolute -top-[7px] z-10 size-3.5 border-t border-l border-neon/40 bg-ink-1 transition-[left] duration-300 ease-out"
          style={{
            left: `${((active + 0.5) / count) * 100}%`,
            transform: "translateX(-50%) rotate(45deg)",
          }}
        />
        <div
          key={active}
          className="relative rounded-[16px] border border-neon/40 bg-ink-1 p-6 [animation:gap-reveal_250ms_ease-out]"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-neon/15 text-neon">
              <d.Icon className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[0.72rem] font-bold tracking-wide text-neon tabular-nums">
                  STEP {active + 1}
                </span>
                <h3 className="text-lg font-bold text-ink-text">{d.label}</h3>
              </div>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-text-3">
                {d.desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 페이지 ───────────────────────── */

export default function LandingStory({
  error,
  isLoggedIn = false,
}: {
  error?: string | null;
  isLoggedIn?: boolean;
}) {
  return (
    <>
      <SiteHeader showLogin={!isLoggedIn} showNav={isLoggedIn} overlay />

      <main className="h-dvh snap-y snap-mandatory overflow-y-auto scroll-smooth bg-ink-base text-ink-text-2">
        {/* ── 뷰 1 : 히어로 + 스탯 ─────────────────── */}
        <section className="relative flex min-h-dvh snap-start flex-col justify-center px-5 pt-24 pb-10 md:px-8">
          <MeshBackground />
          <div className="relative z-10 mx-auto w-full max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-[1.1fr_minmax(0,24rem)] md:gap-16">
              <Reveal className="flex max-w-[34rem] flex-col gap-6">
                <Kicker>공강을 한눈에</Kicker>
                <h1 className="text-[clamp(2.1rem,5vw,3.4rem)] leading-[1.12] font-bold tracking-[-0.03em] text-ink-text">
                  팀원 시간표를 겹쳐
                  <br />
                  모두가 <span className="text-neon">비는 시간</span>을 찾다
                </h1>
                <p className="text-[1.05rem] leading-relaxed text-ink-text-3">
                  에브리타임 시간표를 올리거나 칸을 칠해 등록하면, 모임에 들어온
                  팀원 모두의 공강을 계산하고 투표로 회의 시간을 정해요.
                </p>
                <div className="flex flex-wrap gap-3">
                  {isLoggedIn ? (
                    <Link href="/meetings" className={pillPrimary}>
                      내 모임
                    </Link>
                  ) : (
                    <>
                      <Link href="/signup" className={pillPrimary}>
                        시간표로 시작하기
                      </Link>
                      <Link href="/login" className={pillGhost}>
                        로그인
                      </Link>
                    </>
                  )}
                </div>
                {error && (
                  <p className="rounded-[8px] border border-live/40 bg-live/10 px-4 py-2.5 text-sm text-ink-text-2">
                    {error}
                  </p>
                )}
              </Reveal>
              <Reveal delay={150}>
                <NeonGrid />
              </Reveal>
            </div>

            {/* 스탯 스트립 */}
            <Reveal delay={250}>
              <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-ink-line bg-ink-line sm:grid-cols-4">
                {STATS.map((s) => (
                  <div key={s.label} className="bg-ink-base px-5 py-5">
                    <dt className="text-[2rem] leading-none font-bold tracking-[-0.02em] text-neon tabular-nums">
                      {s.n}
                      <span className="ml-0.5 text-sm font-bold text-ink-text-3">
                        {s.unit}
                      </span>
                    </dt>
                    <dd className="mt-2 text-[0.8rem] text-ink-text-3">
                      {s.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-1 text-ink-text-weak">
            <span className="text-[0.7rem] font-bold tracking-wide">SCROLL</span>
            <span className="animate-bounce text-base leading-none">↓</span>
          </div>
        </section>

        {/* ── 뷰 2 : 문제 + 프로젝트 소개 ──────────── */}
        <section className="flex min-h-dvh snap-start flex-col justify-center bg-ink-base px-5 py-20 md:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
            <div>
              <Reveal className="max-w-2xl">
                <Kicker>왜 틈인가</Kicker>
                <h2 className="mt-4 text-[clamp(1.6rem,3.6vw,2.4rem)] leading-[1.2] font-bold tracking-[-0.02em] text-ink-text">
                  시간 하나 정하는 데 드는 품이 너무 큽니다
                </h2>
              </Reveal>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {PROBLEMS.map((p, i) => (
                  <Reveal
                    key={p.t}
                    delay={i * 110}
                    className="rounded-[14px] border border-ink-line bg-ink-1 p-5"
                  >
                    <span className="inline-flex rounded-[4px] bg-ink-3 px-2 py-1 text-[0.7rem] font-bold tracking-wide text-ink-text-3">
                      {p.k}
                    </span>
                    <h3 className="mt-3 text-base font-bold text-ink-text">
                      {p.t}
                    </h3>
                    <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-text-3">
                      {p.b}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* 프로젝트 소개 — editorial 2단 레이아웃 */}
            <Reveal delay={150}>
              <div className="grid gap-8 border-t border-ink-line pt-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
                <div>
                  <span className="text-[0.72rem] font-bold tracking-[0.12em] text-neon uppercase">
                    About · 틈
                  </span>
                  <h3 className="mt-3 text-[clamp(1.5rem,3vw,2.2rem)] leading-[1.18] font-bold tracking-[-0.025em] text-ink-text">
                    그래서 ‘틈’을
                    <br />
                    만들었어요
                  </h3>
                </div>
                <div className="flex flex-col gap-6">
                  <p className="text-[1.02rem] leading-[1.75] text-ink-text-2">
                    틈(teum)은 대학 팀프로젝트에서 반복되는 ‘시간 맞추기’의 불편을
                    줄이려 만든 공강 매칭 서비스예요. 에브리타임 시간표를 올리면
                    수업 시간을 인식해{" "}
                    <span className="font-bold text-ink-text">182비트</span>로
                    바꾸고, 팀원 전체의 가능 시간을{" "}
                    <span className="font-bold text-ink-text">겹쳐(AND)</span>{" "}
                    공통 공강을 계산한 뒤, 후보 추천과 투표로 회의 시간을
                    확정합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Next.js",
                      "FastAPI",
                      "Supabase",
                      "Google Vision OCR",
                      "자동 테스트 94건",
                    ].map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-ink-line-2 px-3 py-1.5 text-[0.75rem] font-bold text-ink-text-3"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 뷰 3 : 핵심 기능 (벤토) ─────────────── */}
        <section className="flex min-h-dvh snap-start items-center bg-ink px-5 py-24 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Reveal className="max-w-2xl">
              <Kicker>핵심 기능</Kicker>
              <h2 className="mt-4 text-[clamp(1.7rem,3.8vw,2.6rem)] leading-[1.2] font-bold tracking-[-0.02em] text-ink-text">
                흩어진 과정을
                <br />
                한 화면에 담았어요
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-3">
              {/* 큰 카드 */}
              <Reveal
                className="flex flex-col justify-between rounded-[16px] border border-neon/30 bg-gradient-to-br from-ink-1 to-ink-2 p-7 md:col-span-2 md:row-span-2"
              >
                <div>
                  <span className="inline-flex rounded-full border border-neon/50 px-3 py-1 text-[0.72rem] font-bold text-neon">
                    공강 계산
                  </span>
                  <h3 className="mt-5 text-[clamp(1.4rem,2.6vw,2rem)] leading-tight font-bold text-ink-text">
                    모두의 공강을 한 번에
                  </h3>
                  <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-ink-text-3">
                    각자의 가능한 시간을 182비트로 표현하고, 비트 AND 연산으로
                    팀 전체가 비는 시간을 즉시 계산해요. 최소 회의 시간을 넘는
                    구간만 후보로 남습니다.
                  </p>
                </div>
                <div className="mt-6 flex gap-[3px]">
                  {[0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1].map((v, i) => (
                    <span
                      key={i}
                      className={`h-8 flex-1 rounded-[3px] ${
                        v ? "bg-ink-3" : "bg-neon"
                      }`}
                    />
                  ))}
                </div>
              </Reveal>

              {/* 작은 카드 2 */}
              {[
                {
                  tag: "OCR",
                  t: "사진으로 등록",
                  b: "에브리타임 캡처를 올리면 수업 시간을 인식해 채워줘요.",
                },
                {
                  tag: "투표",
                  t: "후보 추천 · 투표",
                  b: "Top 3와 차선책을 제시하고 팀원이 투표로 정해요.",
                },
              ].map((f, i) => (
                <Reveal
                  key={f.t}
                  delay={100 + i * 100}
                  className="rounded-[16px] border border-ink-line bg-ink-1 p-6 md:col-span-1"
                >
                  <span className="text-[0.72rem] font-bold tracking-wide text-neon">
                    {f.tag}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-ink-text">{f.t}</h3>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-text-3">
                    {f.b}
                  </p>
                </Reveal>
              ))}

              {/* 가로 넓은 카드 */}
              <Reveal
                delay={300}
                className="flex flex-col justify-between gap-4 rounded-[16px] border border-ink-line bg-ink-1 p-6 md:col-span-3 md:flex-row md:items-center"
              >
                <div>
                  <span className="text-[0.72rem] font-bold tracking-wide text-neon">
                    확정
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-ink-text">
                    안전하게 확정
                  </h3>
                  <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-text-3">
                    확정 직전에 시간표를 다시 검사하고, 권한·DB 제약으로 잘못된
                    일정이 저장되는 걸 막아요.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {["권한 검사", "재검사", "트랜잭션"].map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-ink-3 px-3 py-1.5 text-[0.75rem] font-bold text-ink-text-2"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── 뷰 4 : 흐름 (타임라인) ──────────────── */}
        <section className="flex min-h-dvh snap-start items-center bg-ink-base px-5 py-24 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Reveal className="max-w-2xl">
              <Kicker>이렇게 흘러가요</Kicker>
              <h2 className="mt-4 text-[clamp(1.7rem,3.8vw,2.6rem)] leading-[1.2] font-bold tracking-[-0.02em] text-ink-text">
                약속까지 <span className="text-neon">다섯 걸음</span>
              </h2>
            </Reveal>

            <FlowSteps />
          </div>
        </section>

        {/* ── 뷰 5 : CTA ──────────────────────────── */}
        <section className="relative flex min-h-dvh snap-start items-center overflow-hidden px-5 py-24 md:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/3 size-[36rem] -translate-x-1/2 rounded-full bg-neon/15 blur-[120px]"
          />
          <div className="relative mx-auto w-full max-w-3xl text-center">
            <Reveal className="flex flex-col items-center gap-6">
              <Kicker>지금 시작</Kicker>
              <h2 className="text-[clamp(1.9rem,4.4vw,3rem)] leading-[1.15] font-bold tracking-[-0.025em] text-ink-text">
                팀의 <span className="text-neon">공강</span>,
                <br />
                한 번에 찾아보세요
              </h2>
              <p className="max-w-md text-[1rem] leading-relaxed text-ink-text-3">
                시간표를 올리고 모임을 만들면, 첫 회의 시간까지 몇 분이면
                정해집니다.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {isLoggedIn ? (
                  <Link href="/meetings" className={pillPrimary}>
                    내 모임
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" className={pillPrimary}>
                      시간표로 시작하기
                    </Link>
                    <Link href="/login" className={pillGhost}>
                      로그인
                    </Link>
                  </>
                )}
              </div>
              <p className="mt-10 text-sm text-ink-text-weak">
                finder · 팀프로젝트 5팀
              </p>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}
