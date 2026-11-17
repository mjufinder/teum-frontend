interface LogoProps {
  size?: "md" | "lg";
}

// 시간표의 두 수업 블록 사이에 난 흰 틈
export default function Logo({ size = "md" }: LogoProps) {
  const large = size === "lg";
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        aria-hidden
        viewBox="0 0 20 24"
        className={large ? "h-10 w-[34px]" : "h-7 w-6"}
      >
        <rect x="0" y="0" width="20" height="10" fill="#036635" />
        <rect x="0" y="14" width="20" height="10" fill="#036635" />
      </svg>
      <span
        className={`font-bold tracking-[-0.03em] text-brand ${
          large ? "text-[2.5rem] leading-none" : "text-[1.375rem] leading-none"
        }`}
      >
        틈
      </span>
    </span>
  );
}
