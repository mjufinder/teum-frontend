"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

const SECTIONS: { t: string; b: React.ReactNode }[] = [
  {
    t: "제1조 (목적)",
    b: "본 약관은 ‘틈’(이하 “서비스”)이 제공하는 공강 시간 매칭 서비스의 이용 조건과 절차, 이용자와 서비스의 권리·의무를 규정함을 목적으로 합니다.",
  },
  {
    t: "제2조 (서비스의 성격)",
    b: "본 서비스는 대학 팀프로젝트 교과목의 일환으로 제작된 학습·시연용 데모(Demo)입니다. 상업적 목적이 아니며, 상시 운영되는 정식 서비스가 아닙니다.",
  },
  {
    t: "제3조 (수집하는 정보)",
    b: (
      <>
        서비스는 공강 계산과 모임 기능 제공을 위해 아래의 최소한의 정보만
        수집합니다.
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>이메일 주소 (로그인·식별용)</li>
          <li>닉네임 등 프로필 정보</li>
          <li>시간표 정보 (수업 시간·개인 불가 시간)</li>
          <li>모임 생성·참여 및 투표 기록</li>
        </ul>
        <span className="mt-2 block">
          구글 로그인 이용 시 구글 계정의 이메일과 기본 프로필 정보를 제공받습니다.
        </span>
      </>
    ),
  },
  {
    t: "제4조 (정보의 이용 목적)",
    b: "수집한 정보는 공통 공강 시간 계산, 모임 생성·참여, 후보 추천 및 투표, 일정 확정·공유 등 서비스 제공 목적으로만 이용하며, 그 외의 목적으로는 이용하지 않습니다.",
  },
  {
    t: "제5조 (보관 및 파기)",
    b: "본 서비스는 데모 특성상, 프로젝트 시연 및 평가가 종료된 후 수집된 모든 데이터(계정·시간표·모임 정보 등)를 지체 없이 파기합니다. 별도의 장기 보관은 하지 않습니다.",
  },
  {
    t: "제6조 (처리 위탁 및 제3자 제공)",
    b: "수집한 정보는 법령에 의한 경우를 제외하고 제3자에게 제공하지 않습니다. 다만 인증·데이터 저장에는 Supabase, 시간표 이미지 인식에는 Google Cloud Vision을 이용하며, 이는 서비스 운영을 위한 처리 위탁에 해당합니다.",
  },
  {
    t: "제7조 (이용자의 의무)",
    b: "이용자는 타인의 정보를 도용하거나, 허위 정보를 등록하거나, 서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.",
  },
  {
    t: "제8조 (책임의 한계)",
    b: "본 서비스는 학습용 데모로서, 이용 과정에서 발생한 데이터 손실·오류에 대해 법적 책임을 지지 않습니다. 중요한 일정은 반드시 별도로 관리하시기 바랍니다.",
  },
  {
    t: "제9조 (약관의 효력)",
    b: "본 약관은 서비스 화면에 게시함으로써 효력이 발생하며, 회원가입 시 본 약관 및 개인정보 수집·이용에 동의한 것으로 간주합니다.",
  },
];

export default function TermsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[85dvh] w-full max-w-[760px] flex-col rounded-[16px] border border-ink-line bg-ink-1 text-ink-text-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex shrink-0 items-center justify-between border-b border-ink-line px-6 py-4">
          <h2 id="terms-title" className="text-lg font-bold text-ink-text">
            이용약관 및 개인정보 처리방침
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid size-8 place-items-center rounded-full text-ink-text-3 transition-colors hover:bg-ink-2 hover:text-ink-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5 text-[0.9rem] leading-relaxed">
          {SECTIONS.map((s) => (
            <section key={s.t}>
              <h3 className="mb-1.5 font-bold text-ink-text">{s.t}</h3>
              <div className="text-ink-text-3">{s.b}</div>
            </section>
          ))}
          <p className="text-xs text-ink-text-weak">
            시행일: 2026년 11월 · 데모 버전 (finder · 팀프로젝트 5팀)
          </p>
        </div>

        <div className="shrink-0 border-t border-ink-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-neon text-[0.95rem] font-bold text-on-neon transition-colors hover:bg-neon-2"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
