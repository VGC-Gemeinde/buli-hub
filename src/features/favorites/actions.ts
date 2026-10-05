"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/features/roles/guard";
import { favoriteRefusal } from "./favorites";
import { addFavorite, hubUserExists, removeFavorite } from "./queries";

export type FavoriteResult = { ok: true } | { ok: false; error: string };

// Sets or clears one favourite of the signed-in user. The star shows up on
// the Favoriten page, the overview, the Spielplan, the dashboard table and
// the player's profile.
export async function setFavorite(input: {
  playerId: string;
  on: boolean;
}): Promise<FavoriteResult> {
  const current = await currentUser();
  const refusal = favoriteRefusal({
    viewerId: current?.userId ?? null,
    playerId: input.playerId,
    // Removing needs no check: deleting a row that is not there is harmless.
    playerExists: input.on ? await hubUserExists(input.playerId) : true,
  });
  if (refusal || !current) {
    return { ok: false, error: refusal ?? "Nicht angemeldet" };
  }

  if (input.on) {
    await addFavorite(current.userId, input.playerId);
  } else {
    await removeFavorite(current.userId, input.playerId);
  }
  revalidatePath("/favoriten");
  revalidatePath("/");
  revalidatePath("/spielplan");
  revalidatePath("/spieler");
  revalidatePath(`/spieler/${input.playerId}`);
  return { ok: true };
}
