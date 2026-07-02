import { describe, expect, it } from "vitest";
import { getPersona, PERSONAS, personaToAdminPayload } from "./personas";

function mustGet(id: string) {
  const persona = getPersona(id);
  if (!persona) {
    throw new Error(`Persona fehlt: ${id}`);
  }
  return persona;
}

describe("personas", () => {
  it("have unique ids and emails", () => {
    const ids = PERSONAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(PERSONAS.length);

    const emails = PERSONAS.map((p) => personaToAdminPayload(p).email);
    expect(new Set(emails).size).toBe(PERSONAS.length);
  });

  it("always confirm the email so no mail flow is triggered", () => {
    for (const persona of PERSONAS) {
      expect(personaToAdminPayload(persona).email_confirm).toBe(true);
    }
  });

  it("voll carries an avatar and a global name", () => {
    const meta = personaToAdminPayload(mustGet("voll")).user_metadata;
    expect(meta.avatar_url).toMatch(/^https:/);
    expect(
      (meta.custom_claims as Record<string, unknown>).global_name,
    ).toBeTruthy();
  });

  it("kein-avatar has no avatar keys at all", () => {
    const meta = personaToAdminPayload(
      mustGet("kein-avatar"),
    ).user_metadata;
    expect(meta).not.toHaveProperty("avatar_url");
    expect(meta).not.toHaveProperty("picture");
  });

  it("langer-name is long enough to force truncation", () => {
    const meta = personaToAdminPayload(
      mustGet("langer-name"),
    ).user_metadata;
    const globalName = (meta.custom_claims as Record<string, string>)
      .global_name;
    expect(globalName.length).toBeGreaterThan(35);
  });

  it("leer has empty metadata", () => {
    expect(personaToAdminPayload(mustGet("leer")).user_metadata).toEqual(
      {},
    );
  });

  it("returns null for unknown personas", () => {
    expect(getPersona("unbekannt")).toBeNull();
  });
});
