"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { getMeetings, toHHMM } from "@/lib/meetings";
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
        <h1 className="page-title">내 모임</h1>
        <Link
          href="/meetings/new"
          className="btn btn-primary"
        >
          새 모임
        </Link>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && !meetings && (
        <p className="text-sm text-muted">불러오는 중...</p>
      )}
      {meetings && meetings.length === 0 && (
        <div className="card flex flex-col items-start gap-3">
          <p className="text-sm text-muted">아직 참여한 모임이 없어요.</p>
          <Link
            href="/meetings/new"
            className="btn btn-primary"
          >
            모임 만들기
          </Link>
        </div>
      )}
      {meetings && meetings.length > 0 && (
        <ul className="border-t-2 border-brand">
          {meetings.map((m) => (
            <li key={m.meeting_id}>
              <Link
                href={`/meetings/${m.meeting_id}`}
                className="row-link flex items-center justify-between gap-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[1.0625rem] font-bold">{m.name}</span>
                  {m.description && (
                    <span className="truncate text-sm text-muted">{m.description}</span>
                  )}
                  <span className="text-sm text-muted">
                    {m.min_duration_min}분 이상, {toHHMM(m.search_start_time)}~{toHHMM(m.search_end_time)} 사이
                  </span>
                </div>
                {m.needs_recalc && (
                  <span className="badge badge-accent shrink-0">
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
