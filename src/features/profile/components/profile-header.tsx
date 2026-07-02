import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function ProfileHeader({
  displayName,
  username,
  avatarUrl,
  roleLabel,
}: {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  roleLabel: string;
}) {
  const name = displayName ?? "Discord-Nutzer";

  return (
    <div className="flex items-center gap-5">
      <Avatar className="size-20">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="text-2xl font-semibold">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="min-w-0 truncate text-4xl text-brand-blue dark:text-white">
            {name}
          </h1>
          <Badge variant="secondary" className="shrink-0">
            {roleLabel}
          </Badge>
        </div>
        {username ? (
          <p className="text-muted-foreground text-sm">@{username}</p>
        ) : null}
      </div>
    </div>
  );
}
