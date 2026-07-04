import { desc } from "drizzle-orm";
import { registrationWindows } from "@/db/schema";
import { db } from "@/lib/db";
import type { RegistrationWindow } from "./registration-window";

export async function latestWindow(): Promise<RegistrationWindow | null> {
  const row = await db.query.registrationWindows.findFirst({
    orderBy: desc(registrationWindows.openedAt),
  });
  return row ?? null;
}

export async function createWindow(
  closesAt: Date,
  openedBy: string,
  seasonNumber: number,
): Promise<void> {
  await db
    .insert(registrationWindows)
    .values({ closesAt, openedBy, seasonNumber });
}
