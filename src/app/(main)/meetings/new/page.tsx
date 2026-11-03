"use client";

import { useRouter } from "next/navigation";

import MeetingForm from "@/components/meeting/MeetingForm";
import { DEFAULT_MIN_DURATION, createMeeting } from "@/lib/meetings";

export default function NewMeetingPage() {
  const router = useRouter();

  async function handleSubmit(name: string, minDuration: number) {
    const meeting = await createMeeting(name, minDuration);
    router.replace(`/meetings/${meeting.meeting_id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">새 모임</h1>
      <MeetingForm
        initialName=""
        initialMinDuration={DEFAULT_MIN_DURATION}
        submitLabel="만들기"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
