"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

import ProfileFields from "@/components/auth/ProfileFields";
import { ErrorNote, PageLoading } from "@/components/layout/PageState";
import { ApiError, authFetch } from "@/lib/api";
import type { UserOut } from "@/types/user";

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const user = await authFetch<UserOut>("/api/v1/auth/me");
        if (cancelled) return;
        // 최초 가입 때 이름에 이메일이 들어올 수 있어서 그 경우 비워 둔다.
        setName(user.name.includes("@") ? "" : user.name);
        setMajor(user.major ?? "");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "정보를 불러오지 못했어요.");
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await authFetch<UserOut>("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), major: major.trim() }),
      });
      router.push("/onboarding/timetable");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="max-w-[480px]">
      <VStack gap={6}>
        <VStack gap={1}>
          <Heading level={1}>프로필을 입력해 주세요</Heading>
          <Text color="secondary">모임에서 팀원이 나를 알아볼 수 있게 해 줘요.</Text>
        </VStack>
        <form onSubmit={handleSubmit}>
          <VStack gap={5}>
            <ProfileFields name={name} major={major} onNameChange={setName} onMajorChange={setMajor} />
            {error && <ErrorNote message={error} />}
            <div>
              <Button
                type="submit"
                label="다음"
                variant="primary"
                size="lg"
                isLoading={saving}
                isDisabled={!name.trim() || !major.trim()}
              />
            </div>
          </VStack>
        </form>
      </VStack>
    </div>
  );
}
