"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";

import { ApiError } from "@/lib/api";
import {
  MIN_DURATIONS,
  SEARCH_TIMES,
  TRAVEL_BUFFERS,
  toMinutes,
} from "@/lib/meetings";

export interface MeetingFormValues {
  name: string;
  description: string;
  minDuration: number;
  searchStartTime: string;
  searchEndTime: string;
  travelBufferMin: number;
}

interface MeetingFormProps {
  initial: MeetingFormValues;
  submitLabel: string;
  // false 를 돌려주면 제출을 취소한 것으로 보고 버튼을 다시 연다
  onSubmit: (values: MeetingFormValues) => Promise<boolean | void>;
}

function validate(values: MeetingFormValues) {
  if (!values.name.trim()) return "모임 이름을 입력해 주세요.";
  const start = toMinutes(values.searchStartTime);
  const end = toMinutes(values.searchEndTime);
  if (start >= end) return "탐색 종료 시각은 시작 시각보다 늦어야 해요.";
  if (end - start < values.minDuration) {
    return "탐색 시간대가 최소 회의시간보다 짧아요.";
  }
  return null;
}

export default function MeetingForm({
  initial,
  submitLabel,
  onSubmit,
}: MeetingFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof MeetingFormValues>(
    key: K,
    value: MeetingFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = validate(values);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const done = await onSubmit({
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
      });
      if (done === false) setSubmitting(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "요청에 실패했어요.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={5}>
        <TextInput
          label="모임 이름"
          size="lg"
          placeholder="예: 캡스톤 주간 회의"
          value={values.name}
          onChange={(value) => update("name", value.slice(0, 30))}
        />
        <TextArea
          label="설명 (선택)"
          placeholder="예: 주간 진행 상황 공유"
          value={values.description}
          onChange={(value) => update("description", value)}
          rows={2}
          maxLength={200}
          htmlMaxLength={200}
        />
        <Selector
          label="최소 회의시간"
          description="이 시간 이상 이어서 비는 구간만 추천해요."
          options={MIN_DURATIONS.map((m) => ({ value: String(m), label: `${m}분` }))}
          value={String(values.minDuration)}
          onChange={(value) => update("minDuration", Number(value))}
        />

        <Collapsible trigger={<Text weight="semibold">세부 조건 (선택)</Text>} defaultIsOpen={false}>
          <VStack gap={4} paddingBlockStart={3}>
            <div className="grid grid-cols-2 gap-3">
              <Selector
                label="탐색 시작 시각"
                options={SEARCH_TIMES.slice(0, -1)}
                value={values.searchStartTime}
                onChange={(value) => update("searchStartTime", value)}
              />
              <Selector
                label="탐색 종료 시각"
                options={SEARCH_TIMES.slice(1)}
                value={values.searchEndTime}
                onChange={(value) => update("searchEndTime", value)}
              />
            </div>
            <Text type="supporting">이 시간대 안에서만 회의 후보를 찾아요.</Text>
            <Selector
              label="이동 여유시간"
              description="수업 앞뒤로 이만큼 비워 두고 후보를 찾아요."
              options={TRAVEL_BUFFERS.map((m) => ({
                value: String(m),
                label: m === 0 ? "없음" : `${m}분`,
              }))}
              value={String(values.travelBufferMin)}
              onChange={(value) => update("travelBufferMin", Number(value))}
            />
          </VStack>
        </Collapsible>

        {error && <Banner status="error" title={error} />}
        <HStack gap={2}>
          <Button type="submit" label={submitLabel} variant="primary" size="lg" isLoading={submitting} />
          <Button label="취소" variant="ghost" size="lg" isDisabled={submitting} onClick={() => router.back()} />
        </HStack>
      </VStack>
    </form>
  );
}
