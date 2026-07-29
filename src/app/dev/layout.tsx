import { notFound } from "next/navigation";
import { devToolsEnabled } from "@/features/dev/enabled";

// One gate for every page under /dev, so a page added later is protected by
// default rather than by remembering to copy a check.
//
// Layouts do not wrap route handlers — each route.ts under /dev calls
// devToolsEnabled() itself, and must keep doing so.
export default async function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await devToolsEnabled())) {
    notFound();
  }

  return children;
}
