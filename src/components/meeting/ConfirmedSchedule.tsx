"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { CheckCircleIcon, ClipboardDocumentIcon, LinkIcon } from "@heroicons/react/20/solid";

import { useConfirm } from "@/components/layout/useConfirm";
import { ApiError } from "@/lib/api";
import { issueShareLink, shareUrl } from "@/lib/confirm";

interface ConfirmedScheduleProps {
  meetingId: string;
  // 확정한 시간 문구. 다른 화면에서 이미 확정돼 무엇인지 모르면 null
  slotLabel: string | null;
  isAdmin: boolean;
}

// 확정된 일정 표시와 외부 공유 링크 발급 (VOTE-03, VOTE-04)
export default function ConfirmedSchedule({ meetingId, slotLabel, isAdmin }: ConfirmedScheduleProps) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const [link, setLink] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIssue() {
    if (link) {
      const ok = await confirm({
        title: "새 링크를 만들까요?",
        description: "새 링크를 만들면 이전 링크는 더 이상 열리지 않아요.",
        actionLabel: "새 링크 만들기",
      });
      if (!ok) return;
    }
    setError(null);
    setCopied(false);
    setIssuing(true);
    try {
      const { share_token } = await issueShareLink(meetingId);
      setLink(shareUrl(share_token));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "공유 링크를 만들지 못했어요.");
    } finally {
      setIssuing(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ body: "공유 링크를 복사했어요", uniqueID: "share-copied" });
    } catch {
      setError("복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <Card variant="green" padding={5}>
      <VStack gap={3}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Icon icon={CheckCircleIcon} size="lg" color="accent" />
          <VStack gap={0}>
            <Text type="supporting">확정된 모임 시간</Text>
            <Text type="large" weight="bold" hasTabularNumbers>
              {slotLabel ?? "이미 확정된 일정이 있어요"}
            </Text>
          </VStack>
        </HStack>
        <Text as="p" display="block">
          모임 시간이 정해졌어요. 링크로 팀원이 아닌 사람에게도 일정을 알려 줄 수 있어요.
        </Text>

        {isAdmin && (
          <VStack gap={2}>
            {link && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1">
                  <TextInput label="공유 링크" value={link} isReadOnly onChange={() => {}} />
                </div>
                <Button
                  label={copied ? "복사됨" : "복사"}
                  variant="primary"
                  icon={<Icon icon={ClipboardDocumentIcon} />}
                  onClick={handleCopy}
                />
              </div>
            )}
            <div>
              <Button
                label={link ? "새 링크 만들기" : "공유 링크 만들기"}
                variant="secondary"
                size="sm"
                icon={<Icon icon={LinkIcon} />}
                isLoading={issuing}
                onClick={handleIssue}
              />
            </div>
          </VStack>
        )}
        {error && <Banner status="error" title={error} />}
        {dialog}
      </VStack>
    </Card>
  );
}
