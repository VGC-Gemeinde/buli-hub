import { ProfileHeader } from "buli-hub";
import { AVATAR_URL } from "./_fixtures";

/* The identity block at the top of `/profil` and `/spieler/[userId]`: 84px
 * round avatar, the condensed 40px name in brand navy (white in dark mode), the
 * role badge (outline pill with a Tick S) and the muted @handle underneath.
 *
 * The variant axis is the identity data itself, because that is what actually
 * varies in production — Discord accounts arrive with or without an avatar,
 * with or without a display name. The name runs through the shared
 * `playerName()` fallback chain (display name → @handle → „Discord-Nutzer"), so
 * the heading is never empty.
 *
 * Each cell is boxed at the real page column (`max-w-xl`) so the `truncate` on
 * the heading is visible rather than theoretical.
 */

/** The complete case: avatar, display name, handle, Admin badge. */
export function AvatarUndName() {
  return (
    <div className="max-w-xl">
      <ProfileHeader
        displayName="Testerino"
        username="testerino"
        avatarUrl={AVATAR_URL}
        roleLabel="Admin"
      />
    </div>
  );
}

/** No avatar uploaded: the fallback renders the first two letters at `text-2xl`
 *  in the muted circle — same 84px footprint. */
export function OhneAvatar() {
  return (
    <div className="max-w-xl">
      <ProfileHeader
        displayName="Blaubeerkuchen"
        username="blaubeerkuchen"
        avatarUrl={null}
        roleLabel="Staff"
      />
    </div>
  );
}

/** A long Discord display name: the heading truncates inside the column and the
 *  role badge — `shrink-0`, so it never squashes — wraps to the line below via
 *  the row's `flex-wrap`. */
export function LangerName() {
  return (
    <div className="max-w-xl">
      <ProfileHeader
        displayName="Blaubeerkuchenbäckermeisterin Annegret III."
        username="annegret"
        avatarUrl={AVATAR_URL}
        roleLabel="Dev"
      />
    </div>
  );
}

/** Neither display name nor handle stored: the fallback label carries the
 *  heading and the @handle line is dropped entirely — no empty row. */
export function OhneMetadaten() {
  return (
    <div className="max-w-xl">
      <ProfileHeader
        displayName={null}
        username={null}
        avatarUrl={null}
        roleLabel="Spieler"
      />
    </div>
  );
}
