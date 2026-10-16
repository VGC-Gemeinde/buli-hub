import { describe, expect, it } from "vitest";
import { VIEW_CHANNEL } from "./naming";
import {
  groupRoom,
  missingOverwrites,
  planMemberRoles,
  planRoomResources,
  type SeasonGroup,
  type SeasonPlayer,
  stageRoom,
} from "./plan";

const G1A: SeasonGroup = { subDivisionId: "sd-1a", tier: 1, position: 0 };
const G1B: SeasonGroup = { subDivisionId: "sd-1b", tier: 1, position: 1 };

describe("planRoomResources", () => {
  it("creates role and channel for an untracked group", () => {
    expect(
      planRoomResources({
        rooms: [groupRoom(G1A)],
        tracked: [],
        liveRoleIds: new Set(),
        liveChannelIds: new Set(),
      }),
    ).toEqual([
      {
        key: "sd-1a",
        role: { status: "create", name: "Division 1a" },
        channel: { status: "create", name: "💬-div-1a-chat-💬" },
      },
    ]);
  });

  it("keeps tracked resources that are still live", () => {
    expect(
      planRoomResources({
        rooms: [groupRoom(G1A)],
        tracked: [
          { subDivisionId: "sd-1a", kind: "group_role", discordId: "r1" },
          { subDivisionId: "sd-1a", kind: "group_channel", discordId: "c1" },
        ],
        liveRoleIds: new Set(["r1"]),
        liveChannelIds: new Set(["c1"]),
      }),
    ).toEqual([
      {
        key: "sd-1a",
        role: { status: "exists", id: "r1" },
        channel: { status: "exists", id: "c1" },
      },
    ]);
  });

  it("recreates a tracked resource whose Discord object is gone", () => {
    const [plan] = planRoomResources({
      rooms: [groupRoom(G1A)],
      tracked: [
        { subDivisionId: "sd-1a", kind: "group_role", discordId: "r1" },
        { subDivisionId: "sd-1a", kind: "group_channel", discordId: "c1" },
      ],
      liveRoleIds: new Set(["r1"]),
      liveChannelIds: new Set(), // channel deleted by a moderator
    });
    expect(plan.role).toEqual({ status: "exists", id: "r1" });
    expect(plan.channel).toEqual({
      status: "create",
      name: "💬-div-1a-chat-💬",
    });
  });

  it("plans every group independently, in order", () => {
    const plans = planRoomResources({
      rooms: [groupRoom(G1A), groupRoom(G1B)],
      tracked: [
        { subDivisionId: "sd-1b", kind: "group_role", discordId: "r2" },
      ],
      liveRoleIds: new Set(["r2"]),
      liveChannelIds: new Set(),
    });
    expect(plans.map((p) => p.key)).toEqual(["sd-1a", "sd-1b"]);
    expect(plans[1].role).toEqual({ status: "exists", id: "r2" });
  });
});

describe("stage rooms", () => {
  it("creates the Playoffs room and keeps a tracked Relegation room", () => {
    expect(
      planRoomResources({
        rooms: [stageRoom("playoff"), stageRoom("relegation")],
        tracked: [
          { subDivisionId: null, kind: "relegation_role", discordId: "rr" },
          { subDivisionId: null, kind: "relegation_channel", discordId: "rc" },
          // A group's role never stands in for a stage's.
          { subDivisionId: "sd-1a", kind: "group_role", discordId: "g" },
        ],
        liveRoleIds: new Set(["rr", "g"]),
        liveChannelIds: new Set(["rc"]),
      }),
    ).toEqual([
      {
        key: "playoff",
        role: { status: "create", name: "Playoffs" },
        channel: { status: "create", name: "💬-playoffs-chat-💬" },
      },
      {
        key: "relegation",
        role: { status: "exists", id: "rr" },
        channel: { status: "exists", id: "rc" },
      },
    ]);
  });

  it("gives a player the role of every stage they have a match in", () => {
    const plan = planMemberRoles({
      players: [
        {
          userId: "u",
          name: "U",
          discordId: "d",
          subDivisionId: "sd-1a",
          stages: ["relegation"],
        },
      ],
      buliRoleId: "buli",
      groupRoleIds: new Map([
        ["sd-1a", "g"],
        ["relegation", "rel"],
        ["playoff", "po"],
      ]),
      members: [{ id: "d", roles: ["po"] }],
    });
    expect(plan.players[0].add.sort()).toEqual(["buli", "g", "rel"]);
    // A stage role the player has no match in comes off.
    expect(plan.removes).toEqual([{ discordId: "d", roleId: "po" }]);
  });
});

describe("missingOverwrites", () => {
  const ids = { guildId: "guild", botUserId: "bot", roleId: "role" };
  const view = VIEW_CHANNEL.toString();

  it("wants all three on a fresh channel, bot first and @everyone last", () => {
    const missing = missingOverwrites({ permissionOverwrites: [] }, ids);
    expect(missing.map((o) => o.id)).toEqual(["bot", "role", "guild"]);
  });

  it("wants nothing on a converged channel", () => {
    expect(
      missingOverwrites(
        {
          permissionOverwrites: [
            { id: "bot", type: 1, allow: view, deny: "0" },
            { id: "role", type: 0, allow: view, deny: "0" },
            { id: "guild", type: 0, allow: "0", deny: view },
            // Inherited from the category — irrelevant here.
            { id: "staff", type: 0, allow: view, deny: "0" },
          ],
        },
        ids,
      ),
    ).toEqual([]);
  });

  it("re-applies only what a moderator changed", () => {
    const missing = missingOverwrites(
      {
        permissionOverwrites: [
          { id: "bot", type: 1, allow: view, deny: "0" },
          { id: "role", type: 0, allow: view, deny: "0" },
          // @everyone overwrite present but no longer denying view.
          { id: "guild", type: 0, allow: "0", deny: "2048" },
        ],
      },
      ids,
    );
    expect(missing.map((o) => o.id)).toEqual(["guild"]);
  });
});

describe("planMemberRoles", () => {
  const BULI = "buli";
  const groupRoleIds = new Map([
    ["sd-1a", "r1a"],
    ["sd-1b", "r1b"],
  ]);
  const player = (
    userId: string,
    discordId: string | null,
    subDivisionId = "sd-1a",
  ): SeasonPlayer => ({ userId, name: userId, discordId, subDivisionId });

  it("does nothing on a converged server", () => {
    const plan = planMemberRoles({
      players: [player("alice", "d-alice")],
      buliRoleId: BULI,
      groupRoleIds,
      members: [{ id: "d-alice", roles: [BULI, "r1a", "unrelated"] }],
    });
    expect(plan.players).toEqual([
      {
        userId: "alice",
        name: "alice",
        discordId: "d-alice",
        add: [],
        blocked: false,
      },
    ]);
    expect(plan.removes).toEqual([]);
    expect(plan.skipped).toEqual([]);
  });

  it("adds whichever hub roles a player is missing", () => {
    const plan = planMemberRoles({
      players: [player("alice", "d-alice"), player("bob", "d-bob", "sd-1b")],
      buliRoleId: BULI,
      groupRoleIds,
      members: [
        { id: "d-alice", roles: [BULI] },
        { id: "d-bob", roles: [] },
      ],
    });
    expect(plan.players.map((p) => p.add)).toEqual([["r1a"], [BULI, "r1b"]]);
  });

  it("removes hub roles from members who are not active placed players", () => {
    const plan = planMemberRoles({
      players: [player("alice", "d-alice")],
      buliRoleId: BULI,
      groupRoleIds,
      members: [
        { id: "d-alice", roles: [BULI, "r1a"] },
        // Last season's player, hand-assigned ping role, dropped player.
        { id: "d-old", roles: [BULI, "r1b"] },
        { id: "d-staff", roles: [BULI, "staff"] },
      ],
    });
    expect(plan.removes).toEqual([
      { discordId: "d-old", roleId: BULI },
      { discordId: "d-old", roleId: "r1b" },
      { discordId: "d-staff", roleId: BULI },
    ]);
  });

  it("moves a player whose group role changed", () => {
    const plan = planMemberRoles({
      players: [player("alice", "d-alice", "sd-1b")],
      buliRoleId: BULI,
      groupRoleIds,
      members: [{ id: "d-alice", roles: [BULI, "r1a"] }],
    });
    expect(plan.players[0].add).toEqual(["r1b"]);
    expect(plan.removes).toEqual([{ discordId: "d-alice", roleId: "r1a" }]);
  });

  it("skips players without a Discord id or not on the server", () => {
    const plan = planMemberRoles({
      players: [player("nobody", null), player("gone", "d-gone")],
      buliRoleId: BULI,
      groupRoleIds,
      members: [],
    });
    expect(plan.players).toEqual([]);
    expect(plan.skipped).toEqual([
      { name: "nobody", reason: "no_discord_id" },
      { name: "gone", reason: "not_on_server" },
    ]);
  });

  it("marks a player blocked while their group has no role yet", () => {
    const plan = planMemberRoles({
      players: [player("alice", "d-alice", "sd-2a")],
      buliRoleId: BULI,
      groupRoleIds, // no entry for sd-2a: its creation failed
      members: [{ id: "d-alice", roles: [] }],
    });
    expect(plan.players[0]).toMatchObject({ add: [BULI], blocked: true });
  });
});
