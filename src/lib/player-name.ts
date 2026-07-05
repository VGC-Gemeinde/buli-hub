// Player-name fallback chain (GO-LIVE-POLISH §1.3): a player is always shown
// with a name — the stored display name, then the Discord @handle, then a
// generic label. Never render an empty name cell or an ad-hoc „Unbekannt".
export const PLAYER_NAME_FALLBACK = "Discord-Nutzer";

export function playerName(
  displayName?: string | null,
  username?: string | null,
): string {
  return displayName ?? username ?? PLAYER_NAME_FALLBACK;
}
