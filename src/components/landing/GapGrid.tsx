// 첫 화면의 예시 격자. 팀원 세 명의 수업을 겹친 결과로, 초록은 누군가 수업이 있는 시간,
// 흰 칸은 모두가 비는 시간이다. 페이지를 열면 수업 블록이 한 번 채워지고 마지막에 틈이 드러난다.
const DAYS = ["월", "화", "수", "목", "금"];
const HOURS = [10, 11, 12, 13, 14, 15];
// [요일][시간] true = 누군가 수업
const BUSY = [
  [true, true, false, true, true, true],
  [true, true, true, true, false, true],
  [true, false, true, true, true, true],
  [true, true, true, false, true, true],
  [false, true, true, true, true, false],
];
const GAP = { day: 1, hour: 4 }; // 화 14:00

export default function GapGrid() {
  let order = 0;
  return (
    <figure className="flex flex-col gap-3">
      <div
        className="grid grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] border-t-2 border-b border-brand border-b-line"
        role="img"
        aria-label="팀원 세 명의 시간표를 겹친 예시. 화요일 14시부터 15시까지 모두 비어 있다."
      >
        <span />
        {DAYS.map((d) => (
          <span key={d} className="py-1.5 text-center text-xs font-bold">
            {d}
          </span>
        ))}
        {HOURS.map((h, hi) => (
          <div key={h} className="contents">
            <span className="border-t border-line pt-1 pr-1.5 text-right text-[11px] text-muted">
              {h}
            </span>
            {DAYS.map((d, di) => {
              const busy = BUSY[di][hi];
              const isGap = di === GAP.day && hi === GAP.hour;
              const delay = busy ? 60 + order++ * 28 : 0;
              return (
                <span
                  key={d}
                  className="relative h-11 border-t border-l border-line last:border-r"
                >
                  {busy && (
                    <span
                      className="hero-slot absolute inset-[3px] bg-brand"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  )}
                  {isGap && (
                    <span
                      className="hero-gap absolute -inset-px z-10 grid place-items-center border-[3px] border-foreground bg-white text-[11px] font-bold"
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
      <figcaption className="flex flex-col gap-1 text-sm">
        <span className="font-bold">화요일 14:00 ~ 15:00, 3명 모두 가능</span>
        <span className="flex flex-wrap gap-x-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 bg-brand" />
            누군가 수업
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 border border-line-strong bg-white" />
            모두 빈 시간
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
