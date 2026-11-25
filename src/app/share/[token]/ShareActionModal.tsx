"use client";

import {
  ArrowRight,
  Calendar,
  CalendarCheck2,
  CalendarPlus,
  Check,
  Copy,
  Download,
  ImageDown,
  Link2,
  Share2,
  X,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export type ActionModalMode = "save" | "share" | null;

interface ShareActionModalProps {
  mode: ActionModalMode;
  url: string;
  meetingName: string;
  canNativeShare: boolean;
  copiedLink: boolean;
  copiedText: boolean;
  savedPng: boolean;
  timetableState: "idle" | "saving" | "saved" | "error";
  googleCalendarUrl: string;
  onClose: () => void;
  onDownloadIcs: () => void;
  onDownloadPng: () => void;
  onApplyTimetable: () => void;
  onNativeShare: () => void;
  onCopyLink: () => void;
  onCopyText: () => void;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-ink-1";

export default function ShareActionModal({
  mode,
  url,
  meetingName,
  canNativeShare,
  copiedLink,
  copiedText,
  savedPng,
  timetableState,
  googleCalendarUrl,
  onClose,
  onDownloadIcs,
  onDownloadPng,
  onApplyTimetable,
  onNativeShare,
  onCopyLink,
  onCopyText,
}: ShareActionModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "share" || !url) return;
    let active = true;
    QRCode.toDataURL(url, {
      width: 220,
      margin: 2,
      color: { dark: "#0a0e0c", light: "#ffffff" },
    })
      .then((res) => {
        if (active) setQrDataUrl(res);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [mode, url]);

  useEffect(() => {
    if (!mode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose]);

  if (!mode) return null;

  const isSave = mode === "save";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-action-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-[24px] bg-ink-1 shadow-[0_24px_70px_-16px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            {isSave ? (
              <Download className="size-4 text-neon" />
            ) : (
              <Share2 className="size-4 text-neon" />
            )}
            <h2 id="share-action-modal-title" className="text-base font-bold text-ink-text">
              {isSave ? "일정 저장하기" : "일정 공유하기"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="모달 닫기"
            className={`flex size-8 items-center justify-center rounded-full bg-ink-2/60 text-ink-text-2 transition-colors hover:bg-ink-2 hover:text-ink-text ${FOCUS_RING}`}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-5 pb-6 pt-1">
          {isSave ? (
            <>
              <button
                type="button"
                onClick={onDownloadIcs}
                className={`flex w-full items-center justify-between rounded-[16px] bg-neon px-4 py-3.5 text-left text-on-neon transition-colors hover:bg-neon-2 ${FOCUS_RING}`}
              >
                <span className="flex items-center gap-3">
                  <CalendarPlus className="size-4.5 shrink-0" />
                  <span className="flex flex-col">
                    <span className="text-sm font-bold">캘린더 파일 (.ics)</span>
                    <span className="text-[11px] opacity-80">Apple · Outlook · 기본 캘린더</span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </button>

              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-full items-center justify-between rounded-[16px] bg-ink-2/60 px-4 py-3.5 text-left text-ink-text transition-colors hover:bg-ink-2 ${FOCUS_RING}`}
              >
                <span className="flex items-center gap-3">
                  <Calendar className="size-4.5 shrink-0 text-neon" />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">Google 캘린더에 추가</span>
                    <span className="text-[11px] text-ink-text-3">매주 반복 일정으로 바로 등록</span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-text-3" />
              </a>

              {timetableState === "saved" ? (
                <Link
                  href="/me/timetable"
                  className={`flex w-full items-center justify-between rounded-[16px] bg-neon/14 px-4 py-3.5 text-left text-neon transition-colors hover:bg-neon/20 ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-3">
                    <Check className="size-4.5 shrink-0" />
                    <span className="flex flex-col">
                      <span className="text-sm font-bold">내 시간표에 반영됨</span>
                      <span className="text-[11px] opacity-85">내 시간표 페이지에서 확인하기</span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onApplyTimetable}
                  disabled={timetableState === "saving"}
                  className={`flex w-full items-center justify-between rounded-[16px] bg-ink-2/60 px-4 py-3.5 text-left text-ink-text transition-colors hover:bg-ink-2 disabled:opacity-50 ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-3">
                    <CalendarCheck2 className="size-4.5 shrink-0 text-neon" />
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {timetableState === "saving"
                          ? "시간표 반영 중..."
                          : timetableState === "error"
                            ? "다시 시도 · 내 시간표 반영"
                            : "내 틈 시간표에 반영"}
                      </span>
                      <span className="text-[11px] text-ink-text-3">
                        로그인 후 개인 시간표에 고정 블록 추가
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-ink-text-3" />
                </button>
              )}

              <button
                type="button"
                onClick={onDownloadPng}
                className={`flex w-full items-center justify-between rounded-[16px] bg-ink-2/60 px-4 py-3.5 text-left text-ink-text transition-colors hover:bg-ink-2 ${FOCUS_RING}`}
              >
                <span className="flex items-center gap-3">
                  {savedPng ? (
                    <Check className="size-4.5 shrink-0 text-neon" />
                  ) : (
                    <ImageDown className="size-4.5 shrink-0 text-neon" />
                  )}
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {savedPng ? "PNG 이미지 저장됨" : "카드 이미지 저장 (PNG)"}
                    </span>
                    <span className="text-[11px] text-ink-text-3">
                      단톡방 · 스토리 공유용 고해상도 카드
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-text-3" />
              </button>
            </>
          ) : (
            <>
              {/* QR 코드 영역 */}
              <div className="mb-1 flex flex-col items-center gap-2.5 rounded-[18px] bg-ink-base/70 px-4 py-4 text-center">
                <div className="rounded-[12px] bg-white p-2.5 shadow-xs">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt={`${meetingName} 확정 일정 QR 코드`}
                      className="size-36 rounded-[4px]"
                    />
                  ) : (
                    <div className="size-36 animate-pulse rounded-[4px] bg-ink-2" />
                  )}
                </div>
                <p className="text-[11px] text-ink-text-3">
                  카메라로 스캔하면 바로 일정을 확인할 수 있어요
                </p>
              </div>

              {canNativeShare && (
                <button
                  type="button"
                  onClick={onNativeShare}
                  className={`flex w-full items-center justify-between rounded-[16px] bg-neon px-4 py-3.5 text-left text-on-neon transition-colors hover:bg-neon-2 ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-3">
                    <Share2 className="size-4.5 shrink-0" />
                    <span className="flex flex-col">
                      <span className="text-sm font-bold">기기로 바로 공유하기</span>
                      <span className="text-[11px] opacity-80">카카오톡 · 메시지 · AirDrop 등</span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0" />
                </button>
              )}

              <button
                type="button"
                onClick={onCopyLink}
                className={`flex w-full items-center justify-between rounded-[16px] bg-ink-2/60 px-4 py-3.5 text-left text-ink-text transition-colors hover:bg-ink-2 ${FOCUS_RING}`}
              >
                <span className="flex items-center gap-3">
                  {copiedLink ? (
                    <Check className="size-4.5 shrink-0 text-neon" />
                  ) : (
                    <Link2 className="size-4.5 shrink-0 text-neon" />
                  )}
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {copiedLink ? "링크가 복사되었어요" : "공유 링크 복사"}
                    </span>
                    <span className="text-[11px] text-ink-text-3">
                      로그인 없이 열리는 전용 링크 복사
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-text-3" />
              </button>

              <button
                type="button"
                onClick={onCopyText}
                className={`flex w-full items-center justify-between rounded-[16px] bg-ink-2/60 px-4 py-3.5 text-left text-ink-text transition-colors hover:bg-ink-2 ${FOCUS_RING}`}
              >
                <span className="flex items-center gap-3">
                  {copiedText ? (
                    <Check className="size-4.5 shrink-0 text-neon" />
                  ) : (
                    <Copy className="size-4.5 shrink-0 text-neon" />
                  )}
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {copiedText ? "안내 문구가 복사되었어요" : "일정 안내 문구 복사"}
                    </span>
                    <span className="text-[11px] text-ink-text-3">
                      모임명 · 시간 · 링크가 정리된 텍스트 복사
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-text-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
