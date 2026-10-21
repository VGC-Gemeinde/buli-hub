// Test personas for local development: accounts with identity shapes a
// single real Discord account cannot produce. Used by /dev/login, which
// creates the account by its (fake) Discord id and signs the browser in.

import type { Role } from "@/features/roles/roles";

export type PersonaId =
  | "voll"
  | "kein-avatar"
  | "langer-name"
  | "leer"
  | "kein-server"
  | "gesperrt"
  | "zuschauerin";

export type Persona = {
  id: PersonaId;
  label: string;
  description: string;
  // A fake Discord snowflake: the account is found and created by it, as a
  // real sign-in would (specs/004-google-cloud-migration).
  discordId: string;
  // What Discord would have sent at sign-in; written to the profile.
  identity: {
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  // Written directly to the profile row on /dev/login — personas have fake
  // Discord ids, so their roles cannot come from a real guild lookup.
  role: Role;
  // Pinned guild membership, same reasoning as role: null = never confirmed
  // (the fail-open state), false = confirmed non-member (gated everywhere).
  guildMember: boolean | null;
  // On the Banliste (docs/plans/banlist.md): signing in makes sure an active
  // ban on the persona's Discord id exists, so the blocked registration is
  // one login away. Staff can lift it on /staff/banliste to see the rest.
  banned?: boolean;
  // Follows a handful of players of the running season (docs/plans/
  // favorites.md): signing in gives the persona demo favourites if it has
  // none, so /favoriten has something to show.
  favorites?: boolean;
};

// Discord's public default avatar — a real, always-available image URL.
const AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/1.png";

export const PERSONAS: readonly Persona[] = [
  {
    id: "voll",
    label: "Voll",
    description: "Avatar + Anzeigename — der Normalfall",
    discordId: "100000000000000001",
    identity: {
      displayName: "Testerino",
      username: "testerino",
      avatarUrl: AVATAR_URL,
    },
    role: "admin",
    guildMember: true,
  },
  {
    id: "kein-avatar",
    label: "Kein Avatar",
    description: "Ohne Avatar — Initialen-Fallback überall",
    discordId: "100000000000000002",
    identity: {
      displayName: "Ohne Avatar",
      username: "ohne_avatar",
      avatarUrl: null,
    },
    role: "staff",
    guildMember: true,
  },
  {
    id: "langer-name",
    label: "Langer Name",
    description: "Sehr langer Anzeigename — testet Truncation",
    discordId: "100000000000000003",
    identity: {
      displayName: "Blaubeerkuchenbäckermeisterin Annegret III.",
      username: "annegret",
      avatarUrl: AVATAR_URL,
    },
    role: "dev",
    guildMember: true,
  },
  {
    id: "leer",
    label: "Leer",
    description: "Ohne Namen und Avatar — alle Fallbacks gleichzeitig",
    discordId: "100000000000000004",
    identity: { displayName: null, username: null, avatarUrl: null },
    role: "player",
    guildMember: null,
  },
  {
    id: "kein-server",
    label: "Kein Server",
    description:
      "Vom Discord-Server ausgetreten — Mitgliedschafts-Gate überall",
    discordId: "100000000000000005",
    identity: {
      displayName: "Ausgetreten",
      username: "ausgetreten",
      avatarUrl: AVATAR_URL,
    },
    role: "player",
    guildMember: false,
  },
  {
    id: "gesperrt",
    label: "Gesperrt",
    description: "Auf der Banliste — Anmeldung gesperrt, Rest offen",
    discordId: "100000000000000006",
    identity: {
      displayName: "Gesperrter Gustav",
      username: "gustav_gesperrt",
      avatarUrl: AVATAR_URL,
    },
    role: "player",
    guildMember: true,
    banned: true,
  },
  {
    id: "zuschauerin",
    label: "Zuschauerin",
    description:
      "Spielt nicht mit, folgt aber Spielern: Favoriten mit Duell und Drop",
    discordId: "100000000000000007",
    identity: {
      displayName: "Zoe Zuschauerin",
      username: "zoe_schaut_zu",
      avatarUrl: AVATAR_URL,
    },
    role: "player",
    guildMember: true,
    favorites: true,
  },
];

export function getPersona(id: string): Persona | null {
  return PERSONAS.find((persona) => persona.id === id) ?? null;
}
