// Anonymisation for cloned production data.
//
// The rule (docs/plans/staging-environment.md §4.3): scrub when the clone
// lands somewhere that widens access. A clone on the maintainer's own machine
// does not — they already have production database access — so local clones
// keep real data and stay realistic. Staging is reachable by more people, so
// its clone is scrubbed.
//
// Synthetic names deliberately keep the properties that break layouts —
// umlauts, emoji, very long names, mention-like strings, right-to-left text.
// Anonymising into "User 1..N" would remove exactly the realism the clone
// exists for.

/** Discord's public default avatars — real, always-available image URLs. */
const AVATAR_BASE = "https://cdn.discordapp.com/embed/avatars/";

export const SYNTHETIC_NAMES: readonly string[] = [
  "Jörg Müller",
  "Käthe Übelacker",
  "Blaubeerkuchenbäckermeisterin Annegret III.",
  "🔥 Blaze 🔥",
  "@everyone",
  "<@100000000000000001>",
  "**Fettgedruckt**",
  "Ai",
  "مرحبا بالعالم",
  "Zoë O'Brien-Schröder",
  "ﾃｽﾄ ﾌﾟﾚｲﾔｰ",
  "Maximilian von und zu Guttenberg-Hohenzollern",
  "n0ob_sl4yer",
  "Ümit Çelik",
  "・゜゜・．",
  "Pikachu ⚡ Fan",
];

export type SyntheticIdentity = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

// Discord handles are lowercase; anything the slug cannot represent (emoji,
// CJK, RTL) collapses, which is why the row number is appended — it keeps the
// handle unique even when the slug is empty.
function handleSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[äàáâã]/g, "a")
    .replace(/[öòóô]/g, "o")
    .replace(/[üùúû]/g, "u")
    .replace(/[ëèéê]/g, "e")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9._]/g, "");
  return slug.length > 0 ? slug.slice(0, 24) : "spieler";
}

/**
 * The synthetic identity for the nth scrubbed user (1-based, matching the
 * `row_number()` the SQL assigns). Exported so the mapping is testable
 * without a database; `buildScrubSql` embeds the same list.
 */
export function syntheticIdentity(n: number): SyntheticIdentity {
  const name = SYNTHETIC_NAMES[(n - 1) % SYNTHETIC_NAMES.length];
  return {
    displayName: name,
    username: `${handleSlug(name)}_${n}`,
    // Every fourth user has no avatar, so the initials fallback stays covered.
    avatarUrl: n % 4 === 0 ? null : `${AVATAR_BASE}${n % 6}.png`,
  };
}

function pgText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function pgTextArray(values: readonly string[]): string {
  return `array[${values.map(pgText).join(", ")}]::text[]`;
}

/**
 * Statements that replace personal data with synthetic equivalents. Run in a
 * single session — they share a temporary table.
 *
 * `keepDiscordIds` is the tester allow-list: users whose Discord snowflake is
 * listed keep their identity, so a tester signing into staging lands on their
 * own copied row (§8.1). Everyone else is anonymised.
 */
export function buildScrubSql(keepDiscordIds: readonly string[]): string[] {
  for (const id of keepDiscordIds) {
    if (!/^\d{1,20}$/.test(id)) {
      throw new Error(
        `Invalid Discord id in the scrub allow-list: ${JSON.stringify(id)} — expected a numeric snowflake`,
      );
    }
  }

  const names = pgTextArray(SYNTHETIC_NAMES);
  const handles = pgTextArray(SYNTHETIC_NAMES.map(handleSlug));
  const count = SYNTHETIC_NAMES.length;
  const keep = pgTextArray(keepDiscordIds);

  // Ordering by id makes the row number — and therefore every synthetic
  // identity — stable across re-clones of the same snapshot.
  const buildMapping = `
create temporary table _scrub_identities as
with ranked as (
  select u.id as user_id, (row_number() over (order by u.id))::int as n
  from auth.users u
  where not exists (
    select 1 from auth.identities i
    where i.user_id = u.id
      and i.provider = 'discord'
      and i.identity_data->>'provider_id' = any(${keep})
  )
)
select
  r.user_id,
  r.n,
  (${names})[((r.n - 1) % ${count}) + 1] as display_name,
  (${handles})[((r.n - 1) % ${count}) + 1] || '_' || r.n as username,
  case when r.n % 4 = 0 then null
       else '${AVATAR_BASE}' || (r.n % 6) || '.png'
  end as avatar_url,
  'scrubbed-' || r.n || '@example.invalid' as email,
  -- Synthetic snowflake, well above the real Discord id range so a scrubbed
  -- id can never collide with a genuine account.
  (900000000000000000::bigint + r.n)::text as provider_id
from ranked r;`.trim();

  // Rebuilt rather than patched: every key the app reads
  // (src/features/auth/identity.ts) gets a synthetic value, and any key not
  // listed here is dropped rather than silently carried over.
  const metadata = `jsonb_build_object(
      'iss', 'https://discord.com/api',
      'sub', s.provider_id,
      'name', s.username,
      'email', s.email,
      'picture', s.avatar_url,
      'full_name', s.display_name,
      'user_name', s.username,
      'avatar_url', s.avatar_url,
      'provider_id', s.provider_id,
      'custom_claims', jsonb_build_object('global_name', s.display_name),
      'email_verified', true,
      'phone_verified', false
    )`;

  return [
    buildMapping,

    // Social handles are replaced rather than nulled, and only where the user
    // had one: deleting them would mean no cloned profile ever renders a
    // social link, so those paths would go untested — the opposite of why the
    // clone exists. `origin` is deliberately left alone; it is a low-cardinality
    // category (a dozen distinct values across the user base), not free text,
    // so it identifies nobody on its own and is worth keeping realistic.
    `update "public"."profiles" p
set display_name = s.display_name,
    username = s.username,
    avatar_url = s.avatar_url,
    twitter_handle = case
      when p.twitter_handle is null then null else s.username
    end,
    bluesky_handle = case
      when p.bluesky_handle is null then null
      else s.username || '.bsky.social'
    end
from _scrub_identities s
where p.user_id = s.user_id;`,

    `update auth.users u
set email = s.email,
    raw_user_meta_data = ${metadata},
    phone = null,
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = ''
from _scrub_identities s
where u.id = s.user_id;`,

    // auth.identities.email is a generated column derived from identity_data,
    // so it follows this update rather than being set directly.
    `update auth.identities i
set identity_data = ${metadata},
    provider_id = s.provider_id
from _scrub_identities s
where i.user_id = s.user_id and i.provider = 'discord';`,

    // Free-text the players wrote themselves. Null-ness and rough length are
    // preserved so the UI still meets empty, short and overlong values.
    `update "public"."registrations" r
set prev_name = case
      when r.prev_name is null then null
      else 'Ehemaliger Name ' || left(md5(r.id::text), 6)
    end,
    greatest_achievements = case
      when r.greatest_achievements is null then null
      else repeat('Anonymisierter Beispieltext für einen Erfolgs-Eintrag. ',
                  greatest(1, length(r.greatest_achievements) / 52))
    end
where r.user_id in (select user_id from _scrub_identities);`,

    // Veteran history is a quasi-identifier: a past season/division/placement
    // triple is a published result, and almost every one of them is unique, so
    // it names a real person even after their display name is gone.
    //
    // Permuted among the scrubbed users rather than nulled. The multiset of
    // values is unchanged — so the seeding tool still sees a realistic spread
    // of veterans and placements — but no row keeps the history of the person
    // it belongs to. Ordering by a hash makes the permutation deterministic.
    `with numbered as (
  select id, prev_season, prev_division, prev_placement,
         row_number() over (order by id) as slot,
         row_number() over (order by md5(id::text)) as pick
  from "public"."registrations"
  where prev_placement is not null
    and user_id in (select user_id from _scrub_identities)
)
update "public"."registrations" r
set prev_season = donor.prev_season,
    prev_division = donor.prev_division,
    prev_placement = donor.prev_placement
from numbered target
join numbered donor on donor.pick = target.slot
where r.id = target.id;`,

    `update "public"."disputes" d
set reason = 'Anonymisierte Begründung ' || left(md5(d.id::text), 6),
    note = case
      when d.note is null then null
      else 'Anonymisierte Notiz ' || left(md5(d.id::text), 6)
    end;`,

    `drop table _scrub_identities;`,
  ];
}
