import { Avatar, AvatarFallback, AvatarImage, Badge } from "buli-hub";
import { AVATAR_URL } from "./_fixtures";

/* Badges are the app's status tags: „Drop" on a withdrawn player, „MotW" on the
 * match of the week, „offen"/„gemeldet" on a fixture, „Rückkehrer"/„Neu" in the
 * seeding sheet (the one place the real app uses <Badge> today — see
 * features/seeding/components/sheet-rows.tsx). */

export function Varianten() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>MotW</Badge>
      <Badge variant="secondary">Rückkehrer</Badge>
      <Badge variant="outline">Neu</Badge>
      <Badge variant="destructive">Drop</Badge>
      <Badge variant="ghost">offen</Badge>
      <Badge variant="link">Zum Match</Badge>
    </div>
  );
}

export function Statustags() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      {(
        [
          ["default", "gemeldet", "Ergebnis steht, Wertung ist eingebucht"],
          ["ghost", "offen", "Spieltag läuft, noch kein Ergebnis"],
          ["secondary", "bestätigt", "Beide Spieler haben zugestimmt"],
          ["destructive", "Einspruch", "Ergebnis wird vom Staff geprüft"],
        ] as const
      ).map(([variant, label, hint]) => (
        <div className="flex items-center gap-3" key={label}>
          <span className="w-24 shrink-0">
            <Badge variant={variant}>{label}</Badge>
          </span>
          <span className="text-[13px] text-muted-foreground">{hint}</span>
        </div>
      ))}
    </div>
  );
}

export function ImKontext() {
  const rows = [
    { name: "Testerino", avatarUrl: AVATAR_URL, tag: "Rückkehrer" as const },
    { name: "Falinks", avatarUrl: null, tag: "Neu" as const },
    { name: "Pawmi", avatarUrl: null, tag: "Drop" as const },
  ];

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
          key={row.name}
        >
          <Avatar className="size-6">
            {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
            <AvatarFallback className="font-semibold text-[10px]">
              {row.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate font-medium text-[13.5px]">
            {row.name}
          </span>
          <Badge
            variant={
              row.tag === "Rückkehrer"
                ? "secondary"
                : row.tag === "Neu"
                  ? "outline"
                  : "destructive"
            }
            className="text-[11.5px]"
          >
            {row.tag}
          </Badge>
        </div>
      ))}
    </div>
  );
}
