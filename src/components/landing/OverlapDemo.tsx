"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { VStack } from "@astryxdesign/core/VStack";

// 첫 화면에서 직접 눌러 보는 예시. 서버 데이터가 아니라 화면 안에서만 계산한다.
const DAYS = ["월", "화", "수", "목", "금"];
const ROWS = 18; // 09:00~18:00, 30분 단위
const ROW_HEIGHT = 17;

interface DemoMember {
  id: string;
  name: string;
  busy: Set<string>;
}

const key = (day: number, row: number) => `${day}-${row}`;

function blocks(list: [number, number, number][]) {
  const set = new Set<string>();
  for (const [day, from, to] of list) {
    for (let row = from; row < to; row++) set.add(key(day, row));
  }
  return set;
}

const INITIAL: DemoMember[] = [
  {
    id: "me",
    name: "나",
    busy: blocks([[0, 0, 4], [0, 8, 11], [1, 2, 6], [2, 0, 4], [2, 12, 15], [3, 2, 6], [4, 6, 10]]),
  },
  {
    id: "a",
    name: "지우",
    busy: blocks([[0, 2, 6], [1, 0, 4], [1, 14, 18], [2, 4, 8], [3, 0, 4], [3, 12, 16], [4, 2, 5]]),
  },
  {
    id: "b",
    name: "서윤",
    busy: blocks([[0, 6, 10], [1, 4, 8], [2, 0, 3], [2, 14, 18], [3, 6, 9], [4, 0, 4], [4, 12, 15]]),
  },
  {
    id: "c",
    name: "도현",
    busy: blocks([[0, 12, 16], [1, 6, 9], [2, 8, 12], [3, 14, 18], [4, 4, 8], [4, 14, 18]]),
  },
];

function timeLabel(row: number) {
  const minutes = 9 * 60 + row * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function heat(ratio: number) {
  return `color-mix(in srgb, var(--color-accent) ${Math.round(ratio * ratio * 46)}%, #f4f7f5)`;
}

interface Run {
  day: number;
  from: number;
  to: number;
}

// 선택한 사람 모두가 비는 가장 긴 연속 구간 (1시간 이상)
function longestCommonRun(members: DemoMember[]): Run | null {
  let best: Run | null = null;
  if (members.length === 0) return best;
  for (let day = 0; day < DAYS.length; day++) {
    let start = -1;
    for (let row = 0; row <= ROWS; row++) {
      const free = row < ROWS && members.every((m) => !m.busy.has(key(day, row)));
      if (free && start < 0) start = row;
      if (!free && start >= 0) {
        if (row - start >= 2 && (!best || row - start > best.to - best.from)) {
          best = { day, from: start, to: row };
        }
        start = -1;
      }
    }
  }
  return best;
}

export default function OverlapDemo() {
  const [members, setMembers] = useState(INITIAL);
  const [on, setOn] = useState<string[]>(INITIAL.map((m) => m.id));
  const active = useMemo(() => members.filter((m) => on.includes(m.id)), [members, on]);
  const best = useMemo(() => longestCommonRun(active), [active]);
  const total = active.length;

  // 칸을 누르면 '나'의 일정이 생기거나 사라지고, 결과가 바로 다시 계산된다.
  function toggleMine(day: number, row: number) {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== "me") return m;
        const busy = new Set(m.busy);
        const k = key(day, row);
        if (busy.has(k)) busy.delete(k);
        else busy.add(k);
        return { ...m, busy };
      })
    );
  }

  return (
    <Card padding={5} elevation="med">
      <VStack gap={4}>
        <div className="teum-toggle">
          <ToggleButtonGroup
            label="겹쳐 볼 팀원"
            type="multiple"
            size="sm"
            value={on}
            onChange={(value) => setOn(Array.isArray(value) ? value : [])}
          >
            {members.map((m) => (
              <ToggleButton
                key={m.id}
                value={m.id}
                label={m.name}
                icon={<Avatar name={m.name} size="xsm" tooltip={false} />}
              />
            ))}
          </ToggleButtonGroup>
        </div>

        <div className="select-none">
          <div className="grid grid-cols-[40px_repeat(5,minmax(0,1fr))] gap-x-1">
            <span />
            {DAYS.map((day) => (
              <span
                key={day}
                className="pb-2 text-center text-[13px] font-medium text-[var(--color-text-secondary)]"
              >
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[40px_repeat(5,minmax(0,1fr))] gap-x-1">
            <div className="flex flex-col">
              {Array.from({ length: ROWS }, (_, row) => (
                <span
                  key={row}
                  style={{ height: ROW_HEIGHT }}
                  className="-translate-y-[7px] pr-2 text-right text-[11px] tabular-nums text-[var(--color-text-secondary)]"
                >
                  {row % 2 === 0 ? timeLabel(row) : ""}
                </span>
              ))}
            </div>
            {DAYS.map((dayLabel, day) => (
              <div key={day} className="relative">
                {best && best.day === day && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-x-[3px] z-20 rounded-[10px] border-[2.5px] border-solid border-[#0b2e1c] shadow-[0_0_0_2px_#fff] transition-[top,height] duration-300 ease-out motion-reduce:transition-none"
                    style={{
                      top: best.from * ROW_HEIGHT - 3,
                      height: (best.to - best.from) * ROW_HEIGHT + 6,
                    }}
                  />
                )}
                <div className="flex flex-col overflow-hidden rounded-[10px]">
                  {Array.from({ length: ROWS }, (_, row) => {
                    const free = active.filter((m) => !m.busy.has(key(day, row))).length;
                    const all = total > 0 && free === total;
                    const tip =
                      total === 0
                        ? "팀원을 선택해 주세요"
                        : all
                          ? `${timeLabel(row)} 모두 가능`
                          : `${timeLabel(row)} ${total}명 중 ${free}명 가능`;
                    return (
                      <Tooltip key={row} content={tip} delay={80} hasHoverIndication={false}>
                        <button
                          type="button"
                          aria-label={`${dayLabel}요일 ${tip}. 누르면 내 일정을 바꿔요`}
                          onClick={() => toggleMine(day, row)}
                          style={{
                            height: ROW_HEIGHT,
                            background: all ? "var(--color-accent)" : heat(total ? free / total : 0),
                          }}
                          className={`w-full cursor-pointer border-0 p-0 transition-colors duration-200 hover:brightness-95 focus-visible:relative focus-visible:z-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-outline-color)] ${
                            row % 2 === 1 ? "border-b border-solid border-white/70" : ""
                          }`}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
          <VStack gap={0.5}>
            <Text type="supporting">
              {total > 0 ? `${total}명이 모두 비는 가장 긴 시간` : "겹쳐 볼 팀원을 골라 주세요"}
            </Text>
            <Text type="large" weight="bold" color="accent" hasTabularNumbers>
              {best
                ? `${DAYS[best.day]}요일 ${timeLabel(best.from)}~${timeLabel(best.to)}`
                : total > 0
                  ? "1시간 이상 겹치는 시간이 없어요"
                  : "-"}
            </Text>
          </VStack>
          <HStack gap={2} vAlign="center">
            <Text type="supporting">적음</Text>
            <span className="flex overflow-hidden rounded-full" aria-hidden="true">
              {[0.25, 0.5, 0.75].map((v) => (
                <i key={v} className="block h-2.5 w-5" style={{ background: heat(v) }} />
              ))}
              <i className="block h-2.5 w-5 bg-[var(--color-accent)]" />
            </span>
            <Text type="supporting">모두 가능</Text>
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
}
