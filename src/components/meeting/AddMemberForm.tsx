"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ApiError, authFetch } from "@/lib/api";
import { isMemberAddedButNotMatched } from "@/lib/candidates";
import { addMember } from "@/lib/meetings";
import type { Member } from "@/types/meeting";

interface UserSuggestion {
  id: number;
  name: string;
  email: string;
}

const AVATAR_PALETTES = [
  "bg-violet-500/20 text-violet-400",
  "bg-blue-500/20 text-blue-400",
  "bg-neon/20 text-neon",
  "bg-orange-400/20 text-orange-400",
  "bg-rose-400/20 text-rose-400",
  "bg-amber-400/20 text-amber-400",
  "bg-cyan-400/20 text-cyan-400",
];

function avatarPalette(id: number) {
  return AVATAR_PALETTES[id % AVATAR_PALETTES.length];
}

async function fetchSuggestions(q: string): Promise<UserSuggestion[]> {
  if (q.length < 2) return [];
  try {
    return await authFetch<UserSuggestion[]>(
      `/api/v1/users/search?q=${encodeURIComponent(q)}`
    );
  } catch {
    return [];
  }
}

interface AddMemberFormProps {
  meetingId: string;
  onAdded: (member: Member, email: string) => Promise<void>;
  onPartiallyAdded: (email: string) => Promise<void>;
}

export default function AddMemberForm({
  meetingId,
  onAdded,
  onPartiallyAdded,
}: AddMemberFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryEmail, setRetryEmail] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (email.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(email);
      setSuggestions(results);
      setOpen(results.length > 0);
      setFocused(-1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function submit(target: string) {
    setError(null);
    setSubmitting(true);
    setOpen(false);
    try {
      const member = await addMember(meetingId, target);
      await onAdded(member, target);
      setEmail("");
      setRetryEmail(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      if (isMemberAddedButNotMatched(e)) {
        setRetryEmail(target);
        await onPartiallyAdded(target);
      } else {
        setRetryEmail(null);
      }
      setError(e instanceof ApiError ? e.message : "팀원을 추가하지 못했어요.");
    }
    setSubmitting(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed) submit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, -1));
    } else if (e.key === "Enter" && focused >= 0) {
      e.preventDefault();
      submit(suggestions[focused].email);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 border-t border-ink-line pt-4">
      <p className="text-xs font-semibold text-ink-text-2">팀원 추가</p>

      <div ref={wrapperRef} className="relative">
        {/* 검색 인풋 */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-text-weak" />
          <input
            id="member-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="이름 또는 이메일로 검색"
            disabled={submitting}
            className="h-10 w-full rounded-[10px] border border-ink-line-2 bg-ink-base py-2 pr-3 pl-9 text-sm text-ink-text placeholder:text-ink-text-weak transition-all focus:border-neon focus:ring-2 focus:ring-neon/20 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* 드롭다운 */}
        {open && suggestions.length > 0 && (
          <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-[14px] border border-ink-line bg-ink-base shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
            <p className="border-b border-ink-line px-4 py-2 text-[11px] font-semibold tracking-wide text-ink-text-weak uppercase">
              틈 사용자
            </p>
            <ul role="listbox">
              {suggestions.map((u, i) => (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={focused === i}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    submit(u.email);
                  }}
                  onMouseEnter={() => setFocused(i)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                    focused === i ? "bg-neon/8" : "hover:bg-ink-1"
                  } ${i > 0 ? "border-t border-ink-line" : ""}`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${avatarPalette(u.id)}`}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-ink-text">
                      {u.name}
                    </span>
                    <span className="truncate text-xs text-ink-text-3">{u.email}</span>
                  </div>
                  {focused === i && (
                    <span className="shrink-0 rounded-full bg-neon/15 px-2 py-0.5 text-[10px] font-semibold text-neon">
                      추가
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 직접 입력 시 추가 버튼 */}
      {email.trim() && !open && (
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-neon text-xs font-bold text-on-neon transition-colors hover:bg-neon-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "추가 중…" : `${email.trim()} 추가하기`}
        </button>
      )}

      <p className="text-[11px] text-ink-text-weak">
        상대가 먼저 틈에 로그인해야 추가할 수 있어요.
      </p>

      {error && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-live">
          <span>{error}</span>
          {retryEmail && (
            <button
              type="button"
              onClick={() => submit(retryEmail)}
              disabled={submitting}
              className="underline underline-offset-2 hover:text-ink-text"
            >
              추천 다시 계산하기
            </button>
          )}
        </div>
      )}
    </form>
  );
}
