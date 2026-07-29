"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  filterUsers,
  type ImpersonatableUser,
} from "@/features/dev/impersonation/users";

// A cloned season is hundreds of users, so the list is search-first and
// capped — the point is to reach one specific player, not to browse.
const VISIBLE = 25;

export function ImpersonationPicker({
  users,
}: {
  users: readonly ImpersonatableUser[];
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => filterUsers(users, query), [users, query]);
  const shown = matches.slice(0, VISIBLE);

  if (users.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Keine Nutzer in der Datenbank — erst <code>npm run db:clone-prod</code>{" "}
        oder Testdaten erzeugen.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Name, Handle, Division oder Rolle suchen…"
        aria-label="Nutzer suchen"
      />

      {matches.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Keine Treffer für „{query}".
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((user) => (
            <li key={user.userId}>
              {/* Plain <a>: full navigation, no prefetch — a Link prefetch
                  would trigger the login as a side effect. */}
              <a
                href={`/dev/login-as?userId=${user.userId}`}
                className="flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 hover:bg-secondary"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-sm">
                    {user.displayName ?? user.username ?? user.userId}
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {[user.username && `@${user.username}`, user.division]
                      .filter(Boolean)
                      .join(" · ") || "ohne Platzierung"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {user.dropped && <Badge variant="destructive">Drop</Badge>}
                  <Badge
                    variant={user.role === "player" ? "outline" : "default"}
                  >
                    {user.role}
                  </Badge>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {matches.length > shown.length && (
        <p className="text-[13px] text-muted-foreground">
          {matches.length - shown.length} weitere Treffer — Suche verfeinern.
        </p>
      )}
    </div>
  );
}
