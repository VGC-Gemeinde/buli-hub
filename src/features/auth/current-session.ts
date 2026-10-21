import { cookies } from "next/headers";
import { sessionCookie } from "@/lib/auth/cookie-options";
import { type ResolvedSession, resolveSession } from "./sessions";

// The session of the current request, from its cookie. Callers go through
// `currentUser()` (roles/guard.ts), which memoizes it per request.
export async function currentSession(): Promise<ResolvedSession | null> {
  const token = (await cookies()).get(sessionCookie().name)?.value;
  return token ? resolveSession(token) : null;
}
