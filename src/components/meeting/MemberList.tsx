import type { Member } from "@/types/meeting";

interface MemberListProps {
  members: Member[];
  myUserId: number;
  emails: Record<number, string>;
  // 후보 시간 호버 시 참석 가능한 member_id 목록 (#5 역하이라이트)
  availableMemberIds?: number[] | null;
  // 넘기면 관리자가 아닌 다른 구성원 옆에 위임 버튼을 보여 준다
  onTransfer?: (member: Member) => void;
  busy?: boolean;
}

export function memberLabel(
  member: Member,
  myUserId: number,
  emails: Record<number, string>
) {
  if (member.user_id === myUserId) return "나";
  return emails[member.user_id] ?? `팀원 ${member.user_id}`;
}

export default function MemberList({
  members,
  myUserId,
  emails,
  availableMemberIds = null,
  onTransfer,
  busy = false,
}: MemberListProps) {
  const availableSet = availableMemberIds ? new Set(availableMemberIds) : null;

  return (
    <ul className="divide-y divide-ink-line">
      {members.map((m) => {
        const isMe = m.user_id === myUserId;
        const isAdmin = m.role === "ADMIN";
        const isAvailable = availableSet ? availableSet.has(m.member_id) : null;

        return (
          <li
            key={m.member_id}
            className={`flex items-center gap-2.5 py-2.5 text-sm transition-opacity first:pt-0 last:pb-0 ${
              isAvailable === false ? "opacity-45" : ""
            }`}
          >
            <span
              aria-hidden
              className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                isMe ? "bg-neon text-on-neon" : "bg-ink-3 text-ink-text-2"
              }`}
            >
              {isMe ? "나" : m.user_id}
            </span>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-ink-text">
                  {isMe ? "나" : `팀원 ${m.user_id}`}
                </span>
                {isAdmin && (
                  <span className="text-[11px] font-semibold text-neon">관리자</span>
                )}
                {m.has_timetable === false && (
                  <span className="rounded bg-ink-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-text-weak">
                    시간표 미등록
                  </span>
                )}
                {isAvailable !== null && (
                  <span
                    className={`ml-1 inline-flex items-center gap-1 text-[10px] font-bold ${
                      isAvailable ? "text-neon" : "text-ink-text-weak"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 rounded-full ${
                        isAvailable ? "bg-neon" : "bg-ink-text-weak"
                      }`}
                    />
                    {isAvailable ? "가능" : "어려움"}
                  </span>
                )}
              </div>
              {emails[m.user_id] && (
                <span className="truncate text-[11px] text-ink-text-3">
                  {emails[m.user_id]}
                </span>
              )}
            </div>

            {onTransfer && !isAdmin && !isMe && (
              <button
                type="button"
                onClick={() => onTransfer(m)}
                disabled={busy}
                className="shrink-0 rounded-[6px] border border-ink-line-2 px-2 py-1 text-[11px] font-semibold text-ink-text-3 transition-colors hover:bg-ink-2 hover:text-ink-text disabled:opacity-50"
              >
                위임
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
