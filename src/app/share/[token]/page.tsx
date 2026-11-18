"use client";

import NextLink from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

import { ErrorNote, PageLoading } from "@/components/layout/PageState";
import Logo from "@/components/layout/Logo";
import { formatSlot } from "@/components/meeting/CandidateList";
import { ApiError } from "@/lib/api";
import { getSharedSchedule } from "@/lib/confirm";
import type { PublicSchedule } from "@/types/vote";

function formatConfirmedAt(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

function SharedSchedule() {
  const { token } = useParams<{ token: string }>();
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSharedSchedule(token)
      .then(setSchedule)
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 404
            ? "유효하지 않거나 만료된 링크예요. 링크를 보낸 사람에게 새 링크를 요청해 주세요."
            : "일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        )
      );
  }, [token]);

  if (error) return <ErrorNote message={error} />;
  if (!schedule) return <PageLoading />;

  return (
    <Card padding={6} elevation="med">
      <VStack gap={5}>
        <VStack gap={1}>
          <Text type="supporting">확정된 모임 시간</Text>
          <Heading level={1}>{schedule.meeting_name}</Heading>
        </VStack>
        <Card variant="green" padding={5}>
          <HStack gap={3} vAlign="center">
            <Icon icon={CalendarDaysIcon} size="lg" color="accent" />
            <Text type="display-3" weight="bold" hasTabularNumbers>
              매주 {formatSlot(schedule.day_of_week, schedule.start_time, schedule.end_time)}
            </Text>
          </HStack>
        </Card>
        <Text type="supporting">{formatConfirmedAt(schedule.confirmed_at)} 확정</Text>
      </VStack>
    </Card>
  );
}

// 로그인 없이 확정 일정을 보는 공개 페이지 (VOTE-04)
export default function SharedSchedulePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center gap-6 px-5 py-12">
      <NextLink href="/" aria-label="틈 처음 화면" className="self-start">
        <Logo />
      </NextLink>
      <Suspense fallback={<PageLoading />}>
        <SharedSchedule />
      </Suspense>
      <Text type="supporting">
        <Link href="/" type="inherit">틈으로 우리 팀 시간도 찾아보기</Link>
      </Text>
    </main>
  );
}
