import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "buli-hub";
import { AVATAR_URL } from "./_fixtures";

/* Avatars are the identity chip everywhere in the app — standings rows, match
 * banners, the user menu, PlayerGrid. Most players have `avatarUrl: null`
 * (Discord only hands us one when they set it), so the two-letter fallback is
 * not an edge case here, it is the common case: every cell shows it.
 *
 * The fallback is always given as a child even next to an AvatarImage — Radix
 * shows it until the image has loaded and keeps it if the load fails. */

const initials = (name: string) => name.slice(0, 2).toUpperCase();

export function Groessen() {
  return (
    <div className="flex items-end gap-6">
      {(
        [
          ["sm", "sm — 24px · Tabellenzeile"],
          ["default", "default — 32px · Spielerliste"],
          ["lg", "lg — 40px · Profilkopf"],
        ] as const
      ).map(([size, label]) => (
        <div className="flex flex-col items-center gap-2" key={size}>
          <Avatar size={size}>
            <AvatarImage src={AVATAR_URL} alt="" />
            <AvatarFallback>{initials("Testerino")}</AvatarFallback>
          </Avatar>
          <span className="text-center text-[11px] text-muted-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OhneBild() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted-foreground">
        Ohne Discord-Profilbild: die ersten zwei Buchstaben des Anzeigenamens.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {["Falinks", "Wooloo", "Pawmi", "annegret", "Blaubeerkuchen"].map(
          (name) => (
            <div className="flex items-center gap-2" key={name}>
              <Avatar>
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{name}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function Gruppe() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">
          Division 1a — 8 Teilnehmer
        </span>
        <AvatarGroup>
          <Avatar>
            <AvatarImage src={AVATAR_URL} alt="" />
            <AvatarFallback>TE</AvatarFallback>
          </Avatar>
          {["Falinks", "Wooloo", "Pawmi"].map((name) => (
            <Avatar key={name}>
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+4</AvatarGroupCount>
        </AvatarGroup>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-muted-foreground">
          Kompakt (sm) — Spieltag 2, offene Partien
        </span>
        <AvatarGroup>
          {["Grafaiai", "Kilowattrel", "Maushold", "Tinkatink"].map((name) => (
            <Avatar key={name} size="sm">
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+2</AvatarGroupCount>
        </AvatarGroup>
      </div>
    </div>
  );
}

export function MitBadge() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted-foreground">
        Der Punkt markiert Spieler mit gemeldetem Ergebnis.
      </p>
      <div className="flex items-end gap-6">
        <Avatar size="sm">
          <AvatarFallback>FA</AvatarFallback>
          <AvatarBadge />
        </Avatar>
        <Avatar>
          <AvatarImage src={AVATAR_URL} alt="" />
          <AvatarFallback>TE</AvatarFallback>
          <AvatarBadge />
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>BL</AvatarFallback>
          <AvatarBadge />
        </Avatar>
      </div>
    </div>
  );
}
