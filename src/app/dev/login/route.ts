import { redirect } from "next/navigation";
import { loginAsPersona } from "@/features/dev/login";

// Dev-only: /dev/login?persona=<id> signs the browser in as a test persona.
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const persona = new URL(request.url).searchParams.get("persona") ?? "";
  const result = await loginAsPersona(persona);
  if (!result.ok) {
    return new Response(result.error, { status: 400 });
  }

  redirect("/");
}
