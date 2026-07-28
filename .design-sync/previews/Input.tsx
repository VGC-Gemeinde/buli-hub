import { Input, Label } from "buli-hub";

/* Input never ships alone in this app: it is always a `grid gap-2` field —
 * Label, control, 13px muted helper. Ported from the profile settings form
 * (`features/profile/components/settings-form.tsx`), the registration form's
 * veteran block and the drop dialog. Uncontrolled `defaultValue` keeps the
 * cards static without a React controlled-input warning. */

export function Formularfelder() {
  return (
    <div className="grid w-full max-w-[560px] grid-cols-1 gap-3.5 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="twitter-handle">Twitter/X-Handle</Label>
        <Input
          id="twitter-handle"
          defaultValue="testerino_vgc"
          autoComplete="off"
          className="h-[38px]"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bluesky-handle">Bluesky-Handle</Label>
        <Input
          id="bluesky-handle"
          placeholder="name.bsky.social"
          autoComplete="off"
          className="h-[38px]"
        />
      </div>
      <p className="text-[13px] text-muted-foreground leading-snug sm:col-span-2">
        Über deine Handles können wir dich in Social-Media-Posts erwähnen.
      </p>
    </div>
  );
}

export function Zustaende() {
  return (
    <div className="grid w-full max-w-[440px] gap-5">
      <div className="grid gap-2">
        <Label htmlFor="state-empty">Grund</Label>
        <Input
          id="state-empty"
          placeholder="Warum wird gedroppt?"
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="state-filled">Pokepaste-Link</Label>
        <Input
          id="state-filled"
          defaultValue="https://pokepast.es/2f8c1a9b0d4e"
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="state-disabled">Anzeigename</Label>
        <Input id="state-disabled" defaultValue="Testerino" disabled readOnly />
        <p className="text-[13px] text-muted-foreground leading-snug">
          Dein Name auf unserem Discord-Server. Ändere ihn dort, falls nötig.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="state-invalid">Video-Link</Label>
        <Input
          id="state-invalid"
          defaultValue="youtu,be/xQ2p"
          aria-invalid
          autoComplete="off"
        />
        <p className="text-destructive text-sm">
          Das ist kein gültiger Link zur Aufnahme.
        </p>
      </div>
    </div>
  );
}

export function Feldtypen() {
  return (
    <div className="grid w-full max-w-[440px] gap-2">
      <span className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
        Deine bisherige Teilnahme
      </span>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-4">
        <div className="grid gap-2">
          <Label htmlFor="prev-season">Letzte Saison</Label>
          <Input
            id="prev-season"
            type="text"
            defaultValue="Saison 4"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prev-name">Damaliger Name</Label>
          <Input
            id="prev-name"
            type="text"
            defaultValue="Blaubeerkuchen"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prev-division">Division</Label>
          <Input
            id="prev-division"
            type="number"
            min={1}
            defaultValue={2}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prev-placement">Platzierung</Label>
          <Input
            id="prev-placement"
            type="number"
            min={1}
            defaultValue={3}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
