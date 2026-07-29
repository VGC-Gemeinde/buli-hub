import { redirect } from "next/navigation";
import { devToolsEnabled } from "@/features/dev/enabled";
import { loginAsUser } from "@/features/dev/impersonation/queries";

// Dev-only: /dev/login-as?userId=<uuid> signs the browser in as an existing
// (cloned) user — the counterpart to /dev/login for real data.
export async function GET(request: Request) {
  if (!(await devToolsEnabled())) {
    return new Response("Not found", { status: 404 });
  }

  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  const result = await loginAsUser(userId);
  if (!result.ok) {
    return new Response(result.error, { status: 400 });
  }

  redirect("/");
}
