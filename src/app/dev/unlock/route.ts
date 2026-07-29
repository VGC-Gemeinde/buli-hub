import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  devToolsConfigured,
  devToolsToken,
  sameToken,
  unlockCookie,
} from "@/features/dev/enabled";

// /dev/unlock?token=<DEV_TOOLS_TOKEN> — the way into /dev on a deployment that
// is not `npm run dev` (staging). Sets the cookie devToolsEnabled() checks.
//
// This is the one /dev route that cannot require the cookie itself, so it
// gates on the token alone. In development it is unnecessary and 404s: the
// unlock flow only exists for deployments where ENABLE_DEV_TOOLS is set.
export async function GET(request: Request) {
  if (!devToolsConfigured() || process.env.NODE_ENV === "development") {
    return new Response("Not found", { status: 404 });
  }

  const token = devToolsToken();
  const supplied = new URL(request.url).searchParams.get("token");
  if (!token || !supplied || !sameToken(supplied, token)) {
    return new Response("Not found", { status: 404 });
  }

  (await cookies()).set(unlockCookie.name, token, unlockCookie.options);

  redirect("/dev");
}
