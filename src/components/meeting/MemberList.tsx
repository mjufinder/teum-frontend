import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import type { Member } from "@/types/meeting";

interface MemberListProps {
  members: Member[];
  myUserId: number;
  emails: Record<number, string>;
  // 넘기면 관리자가 아닌 다른 구성원 옆에 위임 버튼을 보여 준다
  onTransfer?: (member: Member) => void;
  busy?: boolean;
}

export function memberLabel(
  member: Member,
  myUserId: number,
  emails: Record<number, string>
) {
  if (member.user_id === myUserId) return "나";
  return emails[member.user_id] ?? `팀원 ${member.user_id}`;
}

export default function MemberList({
  members,
  myUserId,
  emails,
  onTransfer,
  busy = false,
}: MemberListProps) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {members.map((m) => {
        const mine = m.user_id === myUserId;
        const name = mine ? "나" : `팀원 ${m.user_id}`;
        return (
          <li
            key={m.member_id}
            className="border-0 border-b border-solid border-[var(--color-border)] py-3 last:border-b-0"
          >
            <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
              <HStack gap={3} vAlign="center">
                <Avatar name={name} size="md" tooltip={false} />
                <VStack gap={0}>
                  <HStack gap={2} vAlign="center">
                    <Text weight="semibold">{name}</Text>
                    {m.role === "ADMIN" && <Badge variant="green" label="관리자" />}
                  </HStack>
                  {emails[m.user_id] && (
                    <Text type="supporting" maxLines={1}>
                      {emails[m.user_id]}
                    </Text>
                  )}
                </VStack>
              </HStack>
              {onTransfer && m.role !== "ADMIN" && !mine && (
                <Button
                  label="관리자 넘기기"
                  variant="secondary"
                  size="sm"
                  isDisabled={busy}
                  onClick={() => onTransfer(m)}
                />
              )}
            </HStack>
          </li>
        );
      })}
    </ul>
  );
}
