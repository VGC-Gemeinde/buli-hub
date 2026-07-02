import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DiscordIdentity } from "@/features/auth/identity";

export function ProfileHeader({
  identity,
  roleLabel,
}: {
  identity: DiscordIdentity;
  roleLabel: string;
}) {
  const name = identity.displayName ?? "Discord-Nutzer";

  return (
    <div className="flex items-center gap-5">
      <Avatar className="size-20">
        {identity.avatarUrl ? (
          <AvatarImage src={identity.avatarUrl} alt={name} />
        ) : null}
        <AvatarFallback className="text-2xl font-semibold">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="min-w-0 truncate text-4xl text-brand-blue dark:text-white">
          {name}
        </h1>
        <Badge variant="secondary" className="shrink-0">
          {roleLabel}
        </Badge>
      </div>
    </div>
  );
}
