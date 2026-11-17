"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";

import TimetableGrid from "@/components/timetable/TimetableGrid";
import { ApiError } from "@/lib/api";
import { TOTAL_SLOTS, paintCells, slotState } from "@/lib/timetable";
import { saveMyTimetable } from "@/lib/timetable-api";
import type { SlotState, TimetableBits } from "@/types/timetable";

const tools: { state: SlotState; label: string }[] = [
  { state: "class", label: "수업" },
  { state: "manual", label: "개인 일정" },
  { state: "free", label: "지우개" },
];

const swatch: Record<SlotState, string> = {
  class: "teum-slot-class",
  manual: "teum-slot-manual",
  free: "teum-slot-free ring-1 ring-inset ring-[var(--color-border)]",
};

function hours(slotCount: number) {
  return `${slotCount / 2}시간`;
}

interface TimetableEditorProps {
  initial: TimetableBits;
  warnings?: string[];
  saveLabel?: string;
  onSaved?: () => void;
}

export default function TimetableEditor({
  initial,
  warnings = [],
  saveLabel = "시간표 저장",
  onSaved,
}: TimetableEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const [bits, setBits] = useState(initial);
  // 마지막으로 저장한 상태. 바뀐 칸 수를 세는 기준이다.
  const [savedBits, setSavedBits] = useState(initial);
  const [tool, setTool] = useState<SlotState>("class");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    let classCount = 0;
    let manualCount = 0;
    let changed = 0;
    for (let cell = 0; cell < TOTAL_SLOTS; cell++) {
      const state = slotState(bits, cell);
      if (state === "class") classCount++;
      else if (state === "manual") manualCount++;
      if (state !== slotState(savedBits, cell)) changed++;
    }
    return { classCount, manualCount, freeCount: TOTAL_SLOTS - classCount - manualCount, changed };
  }, [bits, savedBits]);

  function handlePaint(cells: number[]) {
    setBits((prev) => paintCells(prev, cells, tool));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await saveMyTimetable(bits.class_bits, bits.manual_bits);
      setSavedBits(bits);
      toast({ body: "시간표를 저장했어요", uniqueID: "timetable-saved" });
      onSaved?.();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const rows: { state: SlotState; label: string; count: number }[] = [
    { state: "class", label: "수업", count: summary.classCount },
    { state: "manual", label: "개인 일정", count: summary.manualCount },
    { state: "free", label: "회의 가능", count: summary.freeCount },
  ];

  return (
    <VStack gap={4}>
      {warnings.map((warning, i) => (
        <Banner key={i} status="warning" title={warning} />
      ))}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card padding={5}>
          <VStack gap={4}>
            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={3}>
              <SegmentedControl
                label="칠하기 도구"
                value={tool}
                onChange={(value) => setTool(value as SlotState)}
              >
                {tools.map((item) => (
                  <SegmentedControlItem key={item.state} value={item.state} label={item.label} />
                ))}
              </SegmentedControl>
              <Button
                label="바꾼 내용 되돌리기"
                variant="ghost"
                size="sm"
                isDisabled={summary.changed === 0 || saving}
                onClick={() => setBits(savedBits)}
              />
            </HStack>
            <TimetableGrid bits={bits} onPaint={handlePaint} />
            <Text type="supporting" as="p" display="block">
              도구를 고른 뒤 칸을 누르거나 끌어서 칠해요. 이미지 인식은 월~금만 되니 토·일 칸은
              직접 확인해 주세요.
            </Text>
          </VStack>
        </Card>

        <VStack gap={4}>
          <Card padding={5}>
            <VStack gap={4}>
              <Heading level={3}>
                한 주 요약
              </Heading>
              <VStack gap={3}>
                {rows.map((row) => (
                  <HStack key={row.state} hAlign="between" vAlign="center">
                    <HStack gap={2} vAlign="center">
                      <i aria-hidden="true" className={`block size-3.5 rounded-[4px] ${swatch[row.state]}`} />
                      <Text>{row.label}</Text>
                    </HStack>
                    <Text
                      weight="semibold"
                      color={row.state === "free" ? "accent" : "primary"}
                      hasTabularNumbers
                    >
                      {hours(row.count)}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Card>

          <Card padding={5} variant={summary.changed > 0 ? "green" : "muted"}>
            <VStack gap={3}>
              <Text weight="semibold" hasTabularNumbers>
                {summary.changed > 0
                  ? `저장하지 않은 변경 ${summary.changed}칸`
                  : "바뀐 내용이 없어요"}
              </Text>
              <Text type="supporting" as="p" display="block">
                비워 둔 칸이 회의 가능한 시간이 돼요. 저장해야 모임 추천에 반영됩니다.
              </Text>
              {error && <Banner status="error" title={error} />}
              <Button
                label={saveLabel}
                variant="primary"
                width="100%"
                isLoading={saving}
                isDisabled={summary.changed === 0 && !onSaved}
                onClick={handleSave}
              />
            </VStack>
          </Card>
        </VStack>
      </div>
    </VStack>
  );
}
