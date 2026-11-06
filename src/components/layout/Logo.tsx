interface LogoProps {
  size?: "md" | "lg";
}

// 시간표 두 칸 사이의 '틈'을 표시한 로고 마크
export default function Logo({ size = "md" }: LogoProps) {
  const large = size === "lg";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={`grid place-items-center rounded-[10px] bg-brand-strong text-surface ${
          large ? "size-11 rounded-[14px]" : "size-8"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={large ? "size-6" : "size-[18px]"}
        >
          <path d="M5 6h14M5 10h14M5 18h14" />
          <path d="M8 14h8" strokeDasharray="2 3" />
        </svg>
      </span>
      <span
        className={`font-bold tracking-[-0.02em] text-foreground ${
          large ? "text-4xl" : "text-lg"
        }`}
      >
        틈
      </span>
    </span>
  );
}
