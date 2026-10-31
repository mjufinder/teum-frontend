"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface UserOut {
  user_id: number;
  name: string;
  major: string | null;
  profile_completed: boolean;
}

/** 임시 내 정보 / 온보딩 페이지. 백엔드(GET /auth/me) 연동 데모. */
export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function loadMe() {
    try {
      const data = await authFetch<UserOut>("/api/v1/auth/me");
      setUser(data);
      setName(data.name);
      setMajor(data.major ?? "");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push("/login");
        return;
      }
      setMsg(`불러오기 실패: ${String(e)}`);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const data = await authFetch<UserOut>("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name, major }),
      });
      setUser(data);
      setMsg("프로필 저장 완료 ✅");
    } catch (e) {
      setMsg(`저장 실패: ${String(e)}`);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function withdraw() {
    if (!confirm("정말 탈퇴하시겠어요?")) return;
    try {
      await authFetch("/api/v1/auth/me", { method: "DELETE" });
    } catch {
      /* 이미 탈퇴 등 무시 */
    }
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-gray-500">{msg ?? "불러오는 중..."}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">내 정보</h1>
      <div className="w-full max-w-sm rounded border p-4 text-sm">
        <p>user_id: {user.user_id}</p>
        <p>이름: {user.name}</p>
        <p>전공: {user.major ?? "(미등록)"}</p>
        <p>
          온보딩 완료:{" "}
          <span className={user.profile_completed ? "text-green-600" : "text-red-500"}>
            {user.profile_completed ? "예" : "아니오"}
          </span>
        </p>
      </div>

      <form onSubmit={saveProfile} className="flex w-full max-w-sm flex-col gap-3">
        <h2 className="font-semibold">프로필 등록 / 수정 (온보딩)</h2>
        <input
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          placeholder="전공"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          저장
        </button>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </form>

      <div className="flex gap-3">
        <button onClick={logout} className="rounded border px-3 py-2 text-sm">
          로그아웃
        </button>
        <button onClick={withdraw} className="rounded border border-red-300 px-3 py-2 text-sm text-red-500">
          회원 탈퇴
        </button>
      </div>
    </main>
  );
}
