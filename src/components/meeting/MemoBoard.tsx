"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { VStack } from "@astryxdesign/core/VStack";
import { PencilIcon, TrashIcon } from "@heroicons/react/20/solid";

import { useConfirm } from "@/components/layout/useConfirm";
import { memberLabel } from "@/components/meeting/MemberList";
import { ApiError } from "@/lib/api";
import { MEMO_MAX_LENGTH, createMemo, deleteMemo, getMemos, updateMemo } from "@/lib/memos";
import type { Member } from "@/types/meeting";
import type { Memo } from "@/types/memo";

interface MemoBoardProps {
  meetingId: string;
  myUserId: number;
  isAdmin: boolean;
  members: Member[];
  emails: Record<number, string>;
}

function formatCreatedAt(iso: string | null) {
  if (!iso) return "방금";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

// 모임 구성원끼리 공지·할 일을 남기는 메모 (MEET-06)
export default function MemoBoard({
  meetingId,
  myUserId,
  isAdmin,
  members,
  emails,
}: MemoBoardProps) {
  const router = useRouter();
  const [confirm, dialog] = useConfirm();
  const [memos, setMemos] = useState<Memo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    getMemos(meetingId)
      .then(setMemos)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(e instanceof ApiError ? e.message : "메모를 불러오지 못했어요.");
      });
  }, [meetingId, router]);

  function handleError(e: unknown, fallback: string) {
    if (e instanceof ApiError && e.status === 401) {
      router.replace("/login");
      return;
    }
    setActionError(e instanceof ApiError ? e.message : fallback);
  }

  function authorLabel(userId: number) {
    const member = members.find((m) => m.user_id === userId);
    if (member) return memberLabel(member, myUserId, emails);
    return userId === myUserId ? "나" : "이전 구성원";
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setActionError(null);
    setPosting(true);
    try {
      const memo = await createMemo(meetingId, content);
      setMemos((prev) => [memo, ...(prev ?? [])]);
      setDraft("");
    } catch (err) {
      handleError(err, "메모를 남기지 못했어요.");
    } finally {
      setPosting(false);
    }
  }

  function startEdit(memo: Memo) {
    setActionError(null);
    setEditingId(memo.memo_id);
    setEditDraft(memo.content);
  }

  async function handleUpdate(memo: Memo) {
    const content = editDraft.trim();
    if (!content) return;
    setActionError(null);
    setBusyId(memo.memo_id);
    try {
      const updated = await updateMemo(meetingId, memo.memo_id, content);
      setMemos((prev) =>
        (prev ?? []).map((m) => (m.memo_id === memo.memo_id ? { ...m, ...updated } : m))
      );
      setEditingId(null);
    } catch (err) {
      handleError(err, "메모를 수정하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(memo: Memo) {
    const ok = await confirm({
      title: "이 메모를 삭제할까요?",
      description: "삭제한 메모는 되돌릴 수 없어요.",
      actionLabel: "삭제",
      tone: "destructive",
    });
    if (!ok) return;
    setActionError(null);
    setBusyId(memo.memo_id);
    try {
      await deleteMemo(meetingId, memo.memo_id);
      setMemos((prev) => (prev ?? []).filter((m) => m.memo_id !== memo.memo_id));
    } catch (err) {
      handleError(err, "메모를 삭제하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <VStack gap={5}>
      <form onSubmit={handlePost}>
        <VStack gap={3}>
          <TextArea
            label="새 메모"
            isLabelHidden
            placeholder="팀원에게 남길 공지나 할 일을 적어 주세요."
            value={draft}
            onChange={setDraft}
            rows={3}
            maxLength={MEMO_MAX_LENGTH}
            htmlMaxLength={MEMO_MAX_LENGTH}
            isDisabled={posting}
          />
          <HStack hAlign="end">
            <Button
              type="submit"
              label="메모 남기기"
              variant="primary"
              isLoading={posting}
              isDisabled={!draft.trim()}
            />
          </HStack>
        </VStack>
      </form>

      {actionError && <Banner status="error" title={actionError} />}
      {loadError && <Banner status="error" title={loadError} />}
      {!loadError && !memos && <Spinner label="메모를 불러오는 중" />}
      {memos && memos.length === 0 && (
        <EmptyState
          isCompact
          title="아직 남긴 메모가 없어요"
          description="회의 장소나 준비물처럼 팀원이 알아야 할 것을 적어 두세요."
        />
      )}

      {memos && memos.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {memos.map((memo) => {
            const canEdit = memo.author_user_id === myUserId || isAdmin;
            const editing = editingId === memo.memo_id;
            const busy = busyId === memo.memo_id;
            const author = authorLabel(memo.author_user_id);
            return (
              <li key={memo.memo_id}>
                <Card padding={4} variant="muted">
                  <VStack gap={3}>
                    <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
                      <HStack gap={2} vAlign="center">
                        <Avatar name={author} size="sm" tooltip={false} />
                        <Text weight="semibold">{author}</Text>
                        <Text type="supporting">{formatCreatedAt(memo.created_at)}</Text>
                      </HStack>
                      {canEdit && !editing && (
                        <HStack gap={1}>
                          <IconButton
                            label="메모 수정"
                            tooltip="수정"
                            variant="ghost"
                            size="sm"
                            icon={<Icon icon={PencilIcon} />}
                            isDisabled={busy}
                            onClick={() => startEdit(memo)}
                          />
                          <IconButton
                            label="메모 삭제"
                            tooltip="삭제"
                            variant="ghost"
                            size="sm"
                            icon={<Icon icon={TrashIcon} />}
                            isLoading={busy}
                            onClick={() => handleDelete(memo)}
                          />
                        </HStack>
                      )}
                    </HStack>

                    {editing ? (
                      <VStack gap={2}>
                        <TextArea
                          label="메모 수정"
                          isLabelHidden
                          value={editDraft}
                          onChange={setEditDraft}
                          rows={3}
                          maxLength={MEMO_MAX_LENGTH}
                          htmlMaxLength={MEMO_MAX_LENGTH}
                          isDisabled={busy}
                        />
                        <HStack hAlign="end" gap={2}>
                          <Button
                            label="취소"
                            variant="ghost"
                            size="sm"
                            isDisabled={busy}
                            onClick={() => setEditingId(null)}
                          />
                          <Button
                            label="저장"
                            variant="primary"
                            size="sm"
                            isLoading={busy}
                            isDisabled={!editDraft.trim()}
                            onClick={() => handleUpdate(memo)}
                          />
                        </HStack>
                      </VStack>
                    ) : (
                      <p className="m-0 whitespace-pre-wrap break-words">{memo.content}</p>
                    )}
                  </VStack>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </VStack>
  );
}
