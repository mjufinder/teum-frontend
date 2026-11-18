"use client";

import { useRouter } from "next/navigation";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import MeetingForm, { type MeetingFormValues } from "@/components/meeting/MeetingForm";
import {
  DEFAULT_MIN_DURATION,
  DEFAULT_SEARCH_END,
  DEFAULT_SEARCH_START,
  DEFAULT_TRAVEL_BUFFER,
  createMeeting,
} from "@/lib/meetings";

const initial: MeetingFormValues = {
  name: "",
  description: "",
  minDuration: DEFAULT_MIN_DURATION,
  searchStartTime: DEFAULT_SEARCH_START,
  searchEndTime: DEFAULT_SEARCH_END,
  travelBufferMin: DEFAULT_TRAVEL_BUFFER,
};

export default function NewMeetingPage() {
  const router = useRouter();

  async function handleSubmit(values: MeetingFormValues) {
    const meeting = await createMeeting({
      ...values,
      description: values.description || null,
    });
    router.replace(`/meetings/${meeting.meeting_id}`);
  }

  return (
    <div className="max-w-[560px]">
      <VStack gap={6}>
        <VStack gap={1}>
          <Heading level={1}>새 모임</Heading>
          <Text color="secondary">조건을 정하면 그 안에서 함께 비는 시간을 찾아요.</Text>
        </VStack>
        <MeetingForm initial={initial} submitLabel="만들기" onSubmit={handleSubmit} />
      </VStack>
    </div>
  );
}
