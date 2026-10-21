// Supabase's auth.users rows → the hub's users rows (specs/004-google-cloud-migration,
// data-model.md, contracts/switch-procedure.md). Ids and creation times are kept;
// the Discord id is read the way the Supabase sign-in stored it (provider_id,
// else sub); the email is left behind (FR-022).

export type SourceAccount = {
  id: string;
  raw_user_meta_data: unknown;
  created_at: Date;
};

export type Account = { id: string; discordId: string; createdAt: Date };

function discordIdOf(meta: unknown): string | null {
  if (typeof meta !== "object" || meta === null) return null;
  const record = meta as Record<string, unknown>;
  for (const key of ["provider_id", "sub"]) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** The accounts to create, and the source ids that have no Discord id. */
export function mapAccounts(rows: SourceAccount[]): {
  accounts: Account[];
  withoutDiscordId: string[];
} {
  const accounts: Account[] = [];
  const withoutDiscordId: string[] = [];
  for (const row of rows) {
    const discordId = discordIdOf(row.raw_user_meta_data);
    if (discordId) {
      accounts.push({ id: row.id, discordId, createdAt: row.created_at });
    } else {
      withoutDiscordId.push(row.id);
    }
  }
  return { accounts, withoutDiscordId };
}
