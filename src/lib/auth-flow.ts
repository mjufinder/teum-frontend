import { ApiError, authFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { UserOut } from "@/types/user";

export async function getNextPath(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "/login";

  const user = await authFetch<UserOut>("/api/v1/auth/me");
  if (!user.major?.trim()) return "/onboarding/profile";

  try {
    await authFetch("/api/v1/timetable");
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return "/onboarding/timetable";
    throw e;
  }
  return "/meetings";
}
