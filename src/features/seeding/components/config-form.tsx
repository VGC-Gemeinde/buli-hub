"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configureSeeding } from "../actions";

export function ConfigForm({
  initialSize,
  initialDivisionCount,
}: {
  initialSize: number | null;
  initialDivisionCount: number;
}) {
  const router = useRouter();
  const [size, setSize] = useState(initialSize?.toString() ?? "");
  const [count, setCount] = useState(
    initialDivisionCount > 0 ? initialDivisionCount.toString() : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await configureSeeding({
      subDivisionSize: size,
      divisionCount: count,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="division-count">Anzahl Divisionen</Label>
          <Input
            id="division-count"
            type="number"
            min={1}
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sub-division-size">Gruppengröße</Label>
          <Input
            id="sub-division-size"
            type="number"
            min={2}
            value={size}
            onChange={(event) => setSize(event.target.value)}
          />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground leading-snug">
        Die Gruppengröße legt die Länge der Saison fest (ein Spiel pro Woche).
        Innerhalb einer Division werden die Spieler später möglichst gleichmäßig
        auf Gruppen dieser Größe verteilt.
      </p>
      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={submit}>
          {pending ? "Wird gespeichert…" : "Speichern"}
        </Button>
        {saved ? (
          <span className="text-muted-foreground text-sm">Gespeichert</span>
        ) : null}
        {error ? (
          <span className="text-destructive text-sm">{error}</span>
        ) : null}
      </div>
    </div>
  );
}
