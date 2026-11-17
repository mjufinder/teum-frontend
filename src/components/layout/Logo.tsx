interface LogoMarkProps {
  size?: number;
}

// 나란한 두 수업 블록과 그 사이에 난 틈
export function LogoMark({ size = 22 }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="1" width="8" height="20" rx="2.5" fill="#036635" />
      <rect x="13" y="1" width="8" height="20" rx="2.5" fill="#036635" />
    </svg>
  );
}

export default function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const large = size === "lg";
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={large ? 30 : 22} />
      <span
        className={`font-bold tracking-[-0.03em] text-[var(--color-text-primary)] ${
          large ? "text-[1.75rem] leading-none" : "text-[1.25rem] leading-none"
        }`}
      >
        틈
      </span>
    </span>
  );
}
