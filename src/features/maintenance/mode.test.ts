import { describe, expect, it } from "vitest";
import { maintenanceMode, maintenanceRoute } from "./mode";

describe("maintenanceMode", () => {
  it("is on only for MAINTENANCE=on", () => {
    expect(maintenanceMode({ MAINTENANCE: "on" })).toBe(true);
    expect(maintenanceMode({})).toBe(false);
    expect(maintenanceMode({ MAINTENANCE: "" })).toBe(false);
    expect(maintenanceMode({ MAINTENANCE: "true" })).toBe(false);
    expect(maintenanceMode({ MAINTENANCE: "off" })).toBe(false);
  });
});

describe("maintenanceRoute", () => {
  it("lets the legal pages and the maintenance page itself through", () => {
    expect(maintenanceRoute("/impressum")).toBe("pass");
    expect(maintenanceRoute("/datenschutz")).toBe("pass");
    expect(maintenanceRoute("/robots.txt")).toBe("pass");
    expect(maintenanceRoute("/wartung")).toBe("pass");
  });

  it("answers API callers with JSON", () => {
    expect(maintenanceRoute("/api/stream/matches")).toBe("json");
    expect(maintenanceRoute("/api/jobs/discord-season-sync")).toBe("json");
    expect(maintenanceRoute("/api")).toBe("json");
  });

  it("shows the page everywhere else, sign-in and dev tools included", () => {
    for (const path of [
      "/",
      "/spieler/abc",
      "/staff",
      "/auth/callback",
      "/dev",
      "/dev/login",
      "/impressum/x",
      "/apix",
    ]) {
      expect(maintenanceRoute(path)).toBe("page");
    }
  });
});
