"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { UserOut } from "@/types/user";

export default function MePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    setSaved(false);
    setSaveError(null);
    setSaving(true);
    try {
      const user = await authFetch<UserOut>("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), major: major.trim() }),
      });
      setName(user.name);
      setMajor(user.major ?? "");
      setSaved(true);
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
    if (!confirm("정말 탈퇴하시겠어요?")) return;
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
    return <p className="text-sm text-muted">불러오는 중...</p>;
  }

  if (loadError) {
    return <p className="text-sm text-danger">{loadError}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">내 정보</h1>

      <form onSubmit={saveProfile} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
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
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
        {saved && <p className="text-sm text-muted">저장했어요.</p>}
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
      </form>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-5">
        <p className="text-sm font-medium">내 시간표</p>
        <Link
          href="/me/timetable"
          className="whitespace-nowrap rounded-md border border-line bg-surface px-4 py-2 text-sm hover:bg-zinc-50"
        >
          내 시간표 수정
        </Link>
      </div>

      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={withdraw}
          disabled={withdrawing}
          className="rounded-md border border-danger px-4 py-2 text-sm text-danger hover:bg-red-50 disabled:opacity-50"
        >
          {withdrawing ? "처리 중..." : "회원 탈퇴"}
        </button>
        {withdrawError && <p className="text-sm text-danger">{withdrawError}</p>}
      </div>
    </div>
  );
}
