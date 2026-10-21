import { describe, expect, it } from "vitest";
import {
  authorizeUrl,
  discordIdentityFromDiscordUser,
  newCodeVerifier,
  newOAuthState,
  pkceChallenge,
} from "./discord";

describe("pkceChallenge", () => {
  it("matches the RFC 7636 appendix B example", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});

describe("newOAuthState / newCodeVerifier", () => {
  it("are random base64url strings of the lengths PKCE allows", () => {
    expect(newOAuthState()).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newCodeVerifier()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newCodeVerifier()).not.toBe(newCodeVerifier());
  });
});

describe("authorizeUrl", () => {
  it("asks Discord for a code with identify, state and an S256 challenge", () => {
    const url = new URL(
      authorizeUrl({
        clientId: "123",
        redirectUri: "https://buli.vgcgemein.de/auth/callback",
        state: "st",
        codeChallenge: "ch",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://discord.com/oauth2/authorize",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "123",
      scope: "identify",
      redirect_uri: "https://buli.vgcgemein.de/auth/callback",
      state: "st",
      code_challenge: "ch",
      code_challenge_method: "S256",
    });
  });
});

describe("discordIdentityFromDiscordUser", () => {
  it("maps id, display name, username and avatar", () => {
    expect(
      discordIdentityFromDiscordUser({
        id: "80351110224678912",
        username: "nelly",
        global_name: "Nelly",
        avatar: "8342729096ea3675442027381ff50dfe",
      }),
    ).toEqual({
      discordId: "80351110224678912",
      displayName: "Nelly",
      username: "nelly",
      avatarUrl:
        "https://cdn.discordapp.com/avatars/80351110224678912/8342729096ea3675442027381ff50dfe.png",
    });
  });

  it("falls back to the username and to no avatar", () => {
    expect(
      discordIdentityFromDiscordUser({
        id: "1",
        username: "nelly",
        global_name: null,
        avatar: null,
      }),
    ).toEqual({
      discordId: "1",
      displayName: "nelly",
      username: "nelly",
      avatarUrl: null,
    });
  });

  it("shows an animated avatar as its first frame", () => {
    expect(
      discordIdentityFromDiscordUser({ id: "1", username: "n", avatar: "a_x" })
        .avatarUrl,
    ).toBe("https://cdn.discordapp.com/avatars/1/a_x.png");
  });
});
