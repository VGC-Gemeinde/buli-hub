import { describe, expect, it } from "vitest";
import { getPersona, PERSONAS } from "./personas";

function mustGet(id: string) {
  const persona = getPersona(id);
  if (!persona) {
    throw new Error(`Persona fehlt: ${id}`);
  }
  return persona;
}

describe("personas", () => {
  it("have unique ids and Discord ids", () => {
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(PERSONAS.length);
    expect(new Set(PERSONAS.map((p) => p.discordId)).size).toBe(
      PERSONAS.length,
    );
  });

  it("carry Discord ids in snowflake shape, so a ban on them is valid", () => {
    for (const persona of PERSONAS) {
      expect(persona.discordId).toMatch(/^[0-9]{17,20}$/);
    }
  });

  it("voll carries an avatar and a display name", () => {
    const { identity } = mustGet("voll");
    expect(identity.avatarUrl).toMatch(/^https:/);
    expect(identity.displayName).toBeTruthy();
  });

  it("kein-avatar has no avatar", () => {
    expect(mustGet("kein-avatar").identity.avatarUrl).toBeNull();
  });

  it("langer-name is long enough to force truncation", () => {
    expect(mustGet("langer-name").identity.displayName?.length).toBeGreaterThan(
      35,
    );
  });

  it("leer has no name and no avatar at all", () => {
    expect(mustGet("leer").identity).toEqual({
      displayName: null,
      username: null,
      avatarUrl: null,
    });
  });

  it("kein-server is a confirmed non-member with baseline role", () => {
    const persona = mustGet("kein-server");
    expect(persona.role).toBe("player");
    expect(persona.guildMember).toBe(false);
  });

  it("every persona pins its membership explicitly", () => {
    for (const persona of PERSONAS) {
      expect(
        persona.guildMember === null ||
          typeof persona.guildMember === "boolean",
      ).toBe(true);
    }
  });

  it("returns null for unknown personas", () => {
    expect(getPersona("unbekannt")).toBeNull();
  });
});
