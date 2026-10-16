import type {
  ChannelOverwrite,
  GuildChannel,
  GuildMemberRoles,
} from "@/lib/discord";
import {
  allowsView,
  botAllowOverwrite,
  deniesView,
  everyoneDenyOverwrite,
  groupChannelName,
  groupRoleAllowOverwrite,
  groupRoleName,
  STAGE_ROOM_NAMES,
} from "./naming";
import type { SkipReason } from "./report";

// The pure core of the Discord season sync: given the season's desired state
// and what Discord currently holds, what has to change. The converge
// (`converge.ts`) executes the answer; nothing here talks to anything.

export type ResourceKind =
  | "group_role"
  | "group_channel"
  | "playoff_role"
  | "playoff_channel"
  | "relegation_role"
  | "relegation_channel";

// A stage after the regular season with a room of its own
// (docs/plans/relegation-and-playoffs.md).
export type StageRoom = "playoff" | "relegation";

export type SeasonGroup = {
  subDivisionId: string;
  tier: number;
  position: number;
};

// An active placed player (not dropped, in a sub-division), and the stage
// rooms they belong in: those where they have a match.
export type SeasonPlayer = {
  userId: string;
  name: string;
  discordId: string | null;
  subDivisionId: string;
  stages?: readonly StageRoom[];
};

export type TrackedResource = {
  // Null for a stage room's role and channel.
  subDivisionId: string | null;
  kind: ResourceKind;
  discordId: string;
};

// A room: a role and the private channel it sees. A group's room is keyed by
// its sub-division id, a stage's by the stage.
export type SeasonRoom = {
  key: string;
  roleName: string;
  channelName: string;
};

export function groupRoom(group: SeasonGroup): SeasonRoom {
  return {
    key: group.subDivisionId,
    roleName: groupRoleName(group.tier, group.position),
    channelName: groupChannelName(group.tier, group.position),
  };
}

// How the report names a stage's room.
export const STAGE_ROOM_LABEL: Record<StageRoom, string> = {
  playoff: "Playoffs",
  relegation: "Relegation",
};

export function stageRoom(stage: StageRoom): SeasonRoom {
  return {
    key: stage,
    roleName: STAGE_ROOM_NAMES[stage].role,
    channelName: STAGE_ROOM_NAMES[stage].channel,
  };
}

export function isStageKey(key: string): key is StageRoom {
  return key === "playoff" || key === "relegation";
}

// The tracked kinds of a room's role and channel.
export function roomKinds(key: string): {
  role: ResourceKind;
  channel: ResourceKind;
} {
  if (isStageKey(key)) {
    return { role: `${key}_role`, channel: `${key}_channel` };
  }
  return { role: "group_role", channel: "group_channel" };
}

// Per room: the role and channel either exist on Discord (tracked id that
// is still live) or must be created — including tracked ids whose object
// disappeared, which the converge then replaces in the table.
export type ResourceState =
  | { status: "exists"; id: string }
  | { status: "create"; name: string };

export type RoomResourcePlan = {
  key: string;
  role: ResourceState;
  channel: ResourceState;
};

export function planRoomResources(input: {
  rooms: readonly SeasonRoom[];
  tracked: readonly TrackedResource[];
  // Ids that exist on Discord right now.
  liveRoleIds: ReadonlySet<string>;
  liveChannelIds: ReadonlySet<string>;
}): RoomResourcePlan[] {
  const trackedId = (key: string, kind: ResourceKind) =>
    input.tracked.find(
      (row) =>
        row.kind === kind &&
        (row.subDivisionId === null
          ? row.kind.startsWith(key)
          : row.subDivisionId === key),
    )?.discordId ?? null;

  return input.rooms.map((room) => {
    const kinds = roomKinds(room.key);
    const roleId = trackedId(room.key, kinds.role);
    const channelId = trackedId(room.key, kinds.channel);
    return {
      key: room.key,
      role:
        roleId !== null && input.liveRoleIds.has(roleId)
          ? { status: "exists", id: roleId }
          : { status: "create", name: room.roleName },
      channel:
        channelId !== null && input.liveChannelIds.has(channelId)
          ? { status: "exists", id: channelId }
          : { status: "create", name: room.channelName },
    };
  });
}

// The overwrites a group channel must carry, in the order they are applied:
// the bot's own view first (so it never locks itself out), then the group
// role's view, then the @everyone deny. Returns only what is missing on the
// channel, so a converged channel costs no calls. Only the View Channel bit
// is checked: moderators may add other permissions to the same overwrites.
export function missingOverwrites(
  channel: Pick<GuildChannel, "permissionOverwrites">,
  ids: { guildId: string; botUserId: string; roleId: string },
): ChannelOverwrite[] {
  const byId = new Map(
    channel.permissionOverwrites.map((overwrite) => [overwrite.id, overwrite]),
  );
  const missing: ChannelOverwrite[] = [];
  const bot = byId.get(ids.botUserId);
  if (!bot || !allowsView(bot)) {
    missing.push(botAllowOverwrite(ids.botUserId));
  }
  const role = byId.get(ids.roleId);
  if (!role || !allowsView(role)) {
    missing.push(groupRoleAllowOverwrite(ids.roleId));
  }
  const everyone = byId.get(ids.guildId);
  if (!everyone || !deniesView(everyone)) {
    missing.push(everyoneDenyOverwrite(ids.guildId));
  }
  return missing;
}

export type PlayerRolePlan = {
  userId: string;
  name: string;
  discordId: string;
  // Hub roles the member must gain. Empty = already converged.
  add: string[];
  // True when the player's group has no live role yet (its creation failed):
  // the player cannot become ready in this run, whatever `add` achieves.
  blocked: boolean;
};

export type MemberRolePlan = {
  players: PlayerRolePlan[];
  // Hub roles held by members who must not have them: former players, dropped
  // players, a hand-assigned Buli-Spieler role. Removed on every run.
  removes: { discordId: string; roleId: string }[];
  skipped: { name: string; reason: SkipReason }[];
};

export function planMemberRoles(input: {
  players: readonly SeasonPlayer[];
  buliRoleId: string;
  // Live role per room: per sub-division, and per stage once published;
  // absent when the role does not exist.
  groupRoleIds: ReadonlyMap<string, string>;
  members: readonly GuildMemberRoles[];
}): MemberRolePlan {
  const hubRoleIds = new Set<string>([
    input.buliRoleId,
    ...input.groupRoleIds.values(),
  ]);
  const membersById = new Map(input.members.map((m) => [m.id, m]));

  // Desired hub roles per Discord id — exactly the active placed players.
  const desired = new Map<string, Set<string>>();
  const players: PlayerRolePlan[] = [];
  const skipped: MemberRolePlan["skipped"] = [];
  for (const player of input.players) {
    if (player.discordId === null) {
      skipped.push({ name: player.name, reason: "no_discord_id" });
      continue;
    }
    const member = membersById.get(player.discordId);
    if (!member) {
      skipped.push({ name: player.name, reason: "not_on_server" });
      continue;
    }
    const groupRoleId = input.groupRoleIds.get(player.subDivisionId) ?? null;
    const wanted = new Set<string>([input.buliRoleId]);
    if (groupRoleId !== null) {
      wanted.add(groupRoleId);
    }
    for (const stage of player.stages ?? []) {
      const stageRoleId = input.groupRoleIds.get(stage);
      if (stageRoleId !== undefined) {
        wanted.add(stageRoleId);
      }
    }
    desired.set(player.discordId, wanted);
    const held = new Set(member.roles);
    players.push({
      userId: player.userId,
      name: player.name,
      discordId: player.discordId,
      add: [...wanted].filter((roleId) => !held.has(roleId)),
      blocked: groupRoleId === null,
    });
  }

  const removes: MemberRolePlan["removes"] = [];
  for (const member of input.members) {
    const wanted = desired.get(member.id);
    for (const roleId of member.roles) {
      if (hubRoleIds.has(roleId) && !(wanted?.has(roleId) ?? false)) {
        removes.push({ discordId: member.id, roleId });
      }
    }
  }

  return { players, removes, skipped };
}
