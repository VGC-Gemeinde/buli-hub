// Test personas for local development: auth users with metadata shapes a
// single real Discord account cannot produce. Used by /dev/login.

import type { Role } from "@/features/roles/roles";

export type PersonaId =
  | "voll"
  | "kein-avatar"
  | "langer-name"
  | "leer"
  | "kein-server";

export type Persona = {
  id: PersonaId;
  label: string;
  description: string;
  userMetadata: Record<string, unknown>;
  // Written directly to the profile row on /dev/login — personas have fake
  // Discord ids, so their roles cannot come from a real guild lookup.
  role: Role;
  // Pinned guild membership, same reasoning as role: null = never confirmed
  // (the fail-open state), false = confirmed non-member (gated everywhere).
  guildMember: boolean | null;
};

// Discord's public default avatar — a real, always-available image URL.
const AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/1.png";

export const PERSONAS: readonly Persona[] = [
  {
    id: "voll",
    label: "Voll",
    description: "Avatar + Anzeigename — der Normalfall",
    userMetadata: {
      avatar_url: AVATAR_URL,
      picture: AVATAR_URL,
      custom_claims: { global_name: "Testerino" },
      full_name: "testerino",
      name: "testerino",
      provider_id: "100000000000000001",
    },
    role: "admin",
    guildMember: true,
  },
  {
    id: "kein-avatar",
    label: "Kein Avatar",
    description: "Ohne Avatar — Initialen-Fallback überall",
    userMetadata: {
      custom_claims: { global_name: "Ohne Avatar" },
      full_name: "ohne_avatar",
      name: "ohne_avatar",
      provider_id: "100000000000000002",
    },
    role: "staff",
    guildMember: true,
  },
  {
    id: "langer-name",
    label: "Langer Name",
    description: "Sehr langer Anzeigename — testet Truncation",
    userMetadata: {
      avatar_url: AVATAR_URL,
      picture: AVATAR_URL,
      custom_claims: {
        global_name: "Blaubeerkuchenbäckermeisterin Annegret III.",
      },
      full_name: "annegret",
      name: "annegret",
      provider_id: "100000000000000003",
    },
    role: "dev",
    guildMember: true,
  },
  {
    id: "leer",
    label: "Leer",
    description: "Leere Metadaten — alle Fallbacks gleichzeitig",
    userMetadata: {},
    role: "player",
    guildMember: null,
  },
  {
    id: "kein-server",
    label: "Kein Server",
    description:
      "Vom Discord-Server ausgetreten — Mitgliedschafts-Gate überall",
    userMetadata: {
      avatar_url: AVATAR_URL,
      picture: AVATAR_URL,
      custom_claims: { global_name: "Ausgetreten" },
      full_name: "ausgetreten",
      name: "ausgetreten",
      provider_id: "100000000000000005",
    },
    role: "player",
    guildMember: false,
  },
];

export function getPersona(id: string): Persona | null {
  return PERSONAS.find((persona) => persona.id === id) ?? null;
}

export function personaToAdminPayload(persona: Persona) {
  return {
    email: `dev-persona-${persona.id}@example.com`,
    email_confirm: true,
    user_metadata: persona.userMetadata,
  };
}
