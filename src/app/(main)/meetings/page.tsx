"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { getMeetings } from "@/lib/meetings";
import type { Meeting } from "@/types/meeting";

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMeetings()
      .then(setMeetings)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "불러오지 못했어요.");
      });
  }, [router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">내 모임</h1>
        <Link
          href="/meetings/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          새 모임
        </Link>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && !meetings && (
        <p className="text-sm text-muted">불러오는 중...</p>
      )}
      {meetings && meetings.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-muted">아직 참여한 모임이 없어요.</p>
          <Link
            href="/meetings/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
          >
            모임 만들기
          </Link>
        </div>
      )}
      {meetings && meetings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {meetings.map((m) => (
            <li key={m.meeting_id}>
              <Link
                href={`/meetings/${m.meeting_id}`}
                className="flex items-center justify-between rounded-lg border border-line bg-surface p-5 hover:border-brand"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-sm text-muted">
                    최소 {m.min_duration_min}분
                  </span>
                </div>
                {m.needs_recalc && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                    재계산 필요
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
