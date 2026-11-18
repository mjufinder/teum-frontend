"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { PhotoIcon } from "@heroicons/react/20/solid";

import { ErrorNote, PageLoading } from "@/components/layout/PageState";
import { useConfirm } from "@/components/layout/useConfirm";
import TimetableEditor from "@/components/timetable/TimetableEditor";
import TimetableUpload from "@/components/timetable/TimetableUpload";
import { ApiError } from "@/lib/api";
import { getMyTimetable } from "@/lib/timetable-api";
import type { RecognizedTimetable, TimetableBits } from "@/types/timetable";

export default function MyTimetablePage() {
  const router = useRouter();
  const [confirm, dialog] = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bits, setBits] = useState<TimetableBits | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  // 인식 결과가 들어오면 편집기 상태를 새로 시작한다.
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    getMyTimetable()
      .then((timetable) => {
        setBits(timetable);
        setLoading(false);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "시간표를 불러오지 못했어요.");
        setLoading(false);
      });
  }, [router]);

  async function handleReupload() {
    const ok = await confirm({
      title: "이미지로 다시 등록할까요?",
      description:
        "수업 시간만 인식 결과로 바꾸고 개인 일정은 그대로 둬요. 저장해야 반영돼요.",
      actionLabel: "계속",
    });
    if (ok) setUploading(true);
  }

  function handleRecognized(result: RecognizedTimetable) {
    setBits((prev) =>
      prev ? { class_bits: result.class_bits, manual_bits: prev.manual_bits } : prev
    );
    setWarnings(result.warnings);
    setEditorKey((key) => key + 1);
    setUploading(false);
  }

  function renderContent() {
    if (loading) return <PageLoading />;
    if (error) return <ErrorNote message={error} />;
    if (!bits) {
      return (
        <EmptyState
          title="아직 등록한 시간표가 없어요"
          description="시간표를 등록하면 모임에서 함께 비는 시간을 찾을 수 있어요."
          actions={<Button label="시간표 등록하기" variant="primary" href="/onboarding/timetable" />}
        />
      );
    }
    return (
      <>
        {uploading && (
          <div className="max-w-[560px]">
            <TimetableUpload
              onRecognized={handleRecognized}
              onManual={() => setUploading(false)}
              onCancel={() => setUploading(false)}
            />
          </div>
        )}
        <TimetableEditor key={editorKey} initial={bits} warnings={warnings} />
      </>
    );
  }

  return (
    <VStack gap={6}>
      <HStack hAlign="between" vAlign="end" wrap="wrap" gap={4}>
        <VStack gap={1}>
          <Heading level={1}>내 시간표</Heading>
          <Text color="secondary">수업과 개인 일정을 칠해 두면 나머지가 회의 가능한 시간이 돼요.</Text>
        </VStack>
        {bits && !uploading && (
          <Button
            label="이미지로 다시 등록"
            variant="secondary"
            icon={<Icon icon={PhotoIcon} />}
            onClick={handleReupload}
          />
        )}
      </HStack>
      {renderContent()}
      {dialog}
    </VStack>
  );
}
