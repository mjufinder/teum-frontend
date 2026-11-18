"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ClockIcon, PlusIcon } from "@heroicons/react/20/solid";

import { ErrorNote, PageLoading } from "@/components/layout/PageState";
import { ApiError } from "@/lib/api";
import { getMeetings, toHHMM } from "@/lib/meetings";
import type { Meeting } from "@/types/meeting";

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMeetings()
      .then(setMeetings)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "불러오지 못했어요.");
      });
  }, [router]);

  return (
    <VStack gap={6}>
      <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
        <Heading level={1}>내 모임</Heading>
        <Button label="새 모임" variant="primary" icon={<Icon icon={PlusIcon} />} href="/meetings/new" />
      </HStack>
      {error && <ErrorNote message={error} />}
      {!error && !meetings && <PageLoading />}
      {meetings && meetings.length === 0 && (
        <EmptyState
          title="아직 참여한 모임이 없어요"
          description="모임을 만들고 팀원을 추가하면 함께 비는 시간을 찾아 줘요."
          actions={<Button label="모임 만들기" variant="primary" href="/meetings/new" />}
        />
      )}
      {meetings && meetings.length > 0 && (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {meetings.map((m) => (
            <li key={m.meeting_id}>
              <ClickableCard
                label={`${m.name} 모임 열기`}
                href={`/meetings/${m.meeting_id}`}
                padding={5}
                elevation="low"
                height="100%"
              >
                <VStack gap={3}>
                  <HStack hAlign="between" vAlign="start" gap={2}>
                    <Text type="large" weight="bold" maxLines={1}>
                      {m.name}
                    </Text>
                    {m.needs_recalc && <Badge variant="warning" label="재계산 필요" />}
                  </HStack>
                  {m.description && (
                    <Text color="secondary" maxLines={2}>
                      {m.description}
                    </Text>
                  )}
                  <HStack gap={2} vAlign="center">
                    <Icon icon={ClockIcon} size="sm" color="secondary" />
                    <Text type="supporting" hasTabularNumbers>
                      {m.min_duration_min}분 이상, {toHHMM(m.search_start_time)}~
                      {toHHMM(m.search_end_time)} 사이
                    </Text>
                  </HStack>
                </VStack>
              </ClickableCard>
            </li>
          ))}
        </ul>
      )}
    </VStack>
  );
}
