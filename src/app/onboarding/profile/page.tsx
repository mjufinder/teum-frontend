"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  authBtnPrimary,
  authInput,
  authLabel,
  authNotice,
} from "@/components/auth/AuthShell";
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
    return (
      <div className="mx-auto flex w-full max-w-lg animate-pulse flex-col gap-4">
        <div className="h-8 w-52 rounded-lg bg-ink-1" />
        <div className="h-80 rounded-[18px] border border-ink-line bg-ink-1/80" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="rounded-[18px] border border-ink-line bg-ink-1/85 p-7 shadow-[0_12px_48px_rgba(0,0,0,0.14)] backdrop-blur-sm md:p-8">
        <div className="mb-7 flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold tracking-[0.1em] text-ink-text-3 uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-neon" />
            STEP 1 · 프로필 설정
          </span>
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-ink-text">
            프로필을 입력해 주세요
          </h1>
          <p className="text-sm text-ink-text-3">
            모임 팀원에게 표시될 이름과 전공을 입력해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className={authLabel}>
            이름
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 홍길동"
              required
              className={authInput}
            />
          </label>
          <label className={authLabel}>
            전공
            <input
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="예: 컴퓨터공학과"
              required
              className={authInput}
            />
          </label>
          <button
            type="submit"
            disabled={saving || !name.trim() || !major.trim()}
            className={`${authBtnPrimary} mt-1 gap-2`}
          >
            {saving ? "저장 중..." : "다음 단계로"}
            {!saving && <ArrowRight className="size-4" aria-hidden />}
          </button>
          {error && <p className={authNotice}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
