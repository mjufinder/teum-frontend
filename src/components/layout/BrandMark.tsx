/** 틈 로고 — 겹친 두 원(교집합). 두 사람의 시간표가 겹쳐 공통 시간이 생기는 모티프. */
export default function BrandMark({
  className = "h-7 w-[2.6rem]",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 96 64"
      fill="none"
      className={className}
      role="img"
      aria-label="틈 로고"
    >
      <circle
        cx="62"
        cy="32"
        r="25"
        stroke={light ? "#8fe8c4" : "#2f9e5b"}
        strokeWidth="10"
      />
      <circle
        cx="34"
        cy="32"
        r="25"
        stroke={light ? "#ffffff" : "#1a6b3b"}
        strokeWidth="10"
      />
    </svg>
  );
}
