"use client";

import BrandMark from "@/components/layout/BrandMark";

export default function TeumLoader({
  fullScreen = false,
  label = "불러오는 중",
}: {
  fullScreen?: boolean;
  label?: string;
}) {
  const delays = [0, 110, 220, 110, 220, 330, 220, 330, 440];

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-5 bg-ink-base p-8 ${
        fullScreen ? "min-h-dvh" : "min-h-[56vh]"
      }`}
    >
      {/* 회전 궤도 링 + 중앙 공강 격자 웨이브 */}
      <div className="relative grid size-24 place-items-center">
        <div
          aria-hidden
          className="teum-loader-ring absolute inset-0 rounded-full border-2 border-ink-line border-t-neon border-r-neon/45"
        />
        <div
          aria-hidden
          className="teum-loader-ring-reverse absolute inset-2 rounded-full border border-dashed border-neon/25"
        />
        <div aria-hidden className="grid grid-cols-3 gap-1">
          {delays.map((delay, idx) =>
            idx === 4 ? (
              <span
                key={idx}
                style={{ animationDelay: "220ms" }}
                className="teum-loader-gap size-3 rounded-[3px] bg-neon"
              />
            ) : (
              <span
                key={idx}
                style={{ animationDelay: `${delay}ms` }}
                className="teum-loader-cell size-3 rounded-[3px] bg-ink-3"
              />
            )
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 text-ink-text">
          <BrandMark className="h-5 w-8" />
          <span className="text-sm font-bold tracking-tight">틈</span>
        </div>
        <span className="text-[11px] font-medium tracking-wider text-ink-text-3 uppercase">
          {label}
        </span>
      </div>
    </div>
  );
}
