"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";

import ProfileFields from "@/components/auth/ProfileFields";
import { ErrorNote, PageLoading } from "@/components/layout/PageState";
import { useConfirm } from "@/components/layout/useConfirm";
import { ApiError, authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { UserOut } from "@/types/user";

export default function MePage() {
  const router = useRouter();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const user = await authFetch<UserOut>("/api/v1/auth/me");
        if (cancelled) return;
        setName(user.name);
        setMajor(user.major ?? "");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(e instanceof ApiError ? e.message : "정보를 불러오지 못했어요.");
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const user = await authFetch<UserOut>("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), major: major.trim() }),
      });
      setName(user.name);
      setMajor(user.major ?? "");
      toast({ body: "내 정보를 저장했어요", uniqueID: "profile-saved" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setSaveError(err instanceof ApiError ? err.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function withdraw() {
    const ok = await confirm({
      title: "정말 탈퇴하시겠어요?",
      description: "탈퇴하면 이 계정으로 다시 로그인할 수 없어요.",
      actionLabel: "탈퇴하기",
      tone: "destructive",
    });
    if (!ok) return;
    setWithdrawError(null);
    setWithdrawing(true);
    try {
      await authFetch("/api/v1/auth/me", { method: "DELETE" });
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setWithdrawError(e instanceof ApiError ? e.message : "탈퇴하지 못했어요.");
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  if (loadError) {
    return <ErrorNote message={loadError} />;
  }

  return (
    <div className="max-w-[560px]">
      <VStack gap={8}>
        <Heading level={1}>내 정보</Heading>

        <form onSubmit={saveProfile}>
          <VStack gap={5}>
            <ProfileFields name={name} major={major} onNameChange={setName} onMajorChange={setMajor} />
            {saveError && <ErrorNote message={saveError} />}
            <div>
              <Button
                type="submit"
                label="저장"
                variant="primary"
                isLoading={saving}
                isDisabled={!name.trim() || !major.trim()}
              />
            </div>
          </VStack>
        </form>

        <Divider />

        <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
          <VStack gap={0.5}>
            <Text weight="semibold">내 시간표</Text>
            <Text type="supporting">수업이나 일정이 바뀌면 시간표를 고쳐 주세요.</Text>
          </VStack>
          <Button label="내 시간표 수정" variant="secondary" href="/me/timetable" />
        </HStack>

        <Divider />

        <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
          <VStack gap={0.5}>
            <Text weight="semibold">회원 탈퇴</Text>
            <Text type="supporting">탈퇴하면 이 계정으로 다시 로그인할 수 없어요.</Text>
          </VStack>
          <Button label="회원 탈퇴" variant="destructive" isLoading={withdrawing} onClick={withdraw} />
        </HStack>
        {withdrawError && <ErrorNote message={withdrawError} />}
        {dialog}
      </VStack>
    </div>
  );
}
