import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { profiles, users } from "@/db/schema";
import { db } from "@/lib/db";
import { resolveSession } from "./sessions";
import {
  completeSignIn,
  decodeOAuthCookie,
  encodeOAuthCookie,
  type SignInDeps,
} from "./sign-in";

const discordId = "600000000000000001";
const started = { state: "state-1", codeVerifier: "verifier-1" };
const base = {
  code: "code-1",
  state: "state-1",
  error: null,
  started,
  redirectUri: "http://localhost:3000/auth/callback",
  clientId: "client",
  clientSecret: "secret",
};

function deps(overrides: Partial<SignInDeps> = {}): SignInDeps {
  return {
    exchangeCode: vi.fn(async () => "access-token"),
    fetchDiscordUser: vi.fn(async () => ({
      id: discordId,
      username: "nelly",
      global_name: "Nelly",
      avatar: null,
    })),
    syncMember: vi.fn(async () => "player" as const),
    ...overrides,
  };
}

async function cleanup() {
  await db.delete(users).where(eq(users.discordId, discordId));
}

beforeEach(cleanup);
afterAll(cleanup);

describe("completeSignIn", () => {
  it("creates the account, syncs it and starts a session", async () => {
    const d = deps();
    const result = await completeSignIn(base, d);
    if (!result.ok) throw new Error(result.reason);

    expect(d.exchangeCode).toHaveBeenCalledWith({
      code: "code-1",
      codeVerifier: "verifier-1",
      redirectUri: base.redirectUri,
      clientId: "client",
      clientSecret: "secret",
    });
    expect(d.syncMember).toHaveBeenCalledWith(result.userId, {
      discordId,
      displayName: "Nelly",
      username: "nelly",
      avatarUrl: null,
    });
    expect(await resolveSession(result.sessionToken)).toEqual({
      userId: result.userId,
      discordId,
    });
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, result.userId),
    });
    expect(profile?.displayName).toBe("Nelly");
  });

  it("finds the same account on the next sign-in", async () => {
    const first = await completeSignIn(base, deps());
    const second = await completeSignIn(base, deps());
    expect(first.ok && second.ok && first.userId === second.userId).toBe(true);
  });

  it("still signs in when the member sync fails", async () => {
    const result = await completeSignIn(
      base,
      deps({
        syncMember: vi.fn(async () => {
          throw new Error("Discord down");
        }),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("refuses an answer this browser did not start, and calls Discord not at all", async () => {
    for (const input of [
      { ...base, started: null },
      { ...base, state: "other" },
      { ...base, state: null },
    ]) {
      const d = deps();
      const result = await completeSignIn(input, d);
      expect(result).toMatchObject({ ok: false, kind: "unknown" });
      expect(d.exchangeCode).not.toHaveBeenCalled();
    }
    const rows = await db.execute(
      sql`select 1 from users where discord_id = ${discordId}`,
    );
    expect(rows.length).toBe(0);
  });

  it("reports a cancelled consent screen", async () => {
    expect(
      await completeSignIn(
        { ...base, code: null, error: "access_denied" },
        deps(),
      ),
    ).toMatchObject({ ok: false, kind: "cancelled" });
  });

  it("reports a failed token exchange as unknown", async () => {
    const result = await completeSignIn(
      base,
      deps({
        exchangeCode: vi.fn(async () => {
          throw new Error("invalid_grant");
        }),
      }),
    );
    expect(result).toMatchObject({ ok: false, kind: "unknown" });
  });
});

describe("OAuth cookie", () => {
  it("round-trips state and verifier", () => {
    expect(decodeOAuthCookie(encodeOAuthCookie("s", "v"))).toEqual({
      state: "s",
      codeVerifier: "v",
    });
  });

  it("rejects missing or malformed values", () => {
    expect(decodeOAuthCookie(undefined)).toBeNull();
    expect(decodeOAuthCookie("only")).toBeNull();
    expect(decodeOAuthCookie("a.b.c")).toBeNull();
    expect(decodeOAuthCookie(".v")).toBeNull();
  });
});
