"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    return <p className="text-sm text-muted">불러오는 중...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">프로필을 입력해 주세요</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
        <label className="flex flex-col gap-1 text-sm font-medium">
          이름
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          전공
          <input
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none"
          />
        </label>
        <div>
          <button
            type="submit"
            disabled={saving || !name.trim() || !major.trim()}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
          >
            {saving ? "저장 중..." : "다음"}
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </div>
  );
}
