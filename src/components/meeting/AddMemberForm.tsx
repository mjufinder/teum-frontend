"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { addMember } from "@/lib/meetings";
import type { Member } from "@/types/meeting";

interface AddMemberFormProps {
  meetingId: string;
  onAdded: (member: Member, email: string) => Promise<void>;
}

export default function AddMemberForm({
  meetingId,
  onAdded,
}: AddMemberFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setSubmitting(true);
    try {
      const member = await addMember(meetingId, trimmed);
      await onAdded(member, trimmed);
      setEmail("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "팀원을 추가하지 못했어요.");
    }
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col gap-3"
    >
      <label htmlFor="member-email" className="text-sm font-semibold">
        팀원 추가
      </label>
      <div className="flex gap-2">
        <input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          className="input"
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary shrink-0"
        >
          추가
        </button>
      </div>
      <p className="text-sm text-muted">
        상대가 먼저 틈에 로그인해야 추가할 수 있어요.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
