"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Spoiler protection for the featured match's result on the match page
// (neutral viewers only — participants and staff see everything). Until
// revealed, the page shows the pairing header and a cover card instead of the
// result summary passed as children. Client-side reveal only: a courtesy
// spoiler tag, not security.
export function MotwSpoiler({
  round,
  groupName,
  seasonLabel,
  playerAName,
  playerBName,
  children,
}: {
  round: number;
  groupName: string;
  seasonLabel: string;
  playerAName: string;
  playerBName: string;
  children: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) {
    return <>{children}</>;
  }

  return (
    <>
      <Link
        href="/"
        className="mb-4.5 inline-block font-medium text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-white"
      >
        ← Zur Übersicht
      </Link>
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.12em]">
        Spieltag {round} · {groupName} · {seasonLabel}
      </p>
      <h1 className="mt-2 text-[34px] text-brand-blue leading-[1.1] sm:text-[40px] dark:text-white">
        <span className="break-words">{playerAName}</span>{" "}
        <span className="text-muted-foreground">vs.</span>{" "}
        <span className="break-words">{playerBName}</span>
      </h1>

      <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-brand-orange/40 bg-brand-orange/5 px-6 py-5">
        <p className="font-semibold text-sm">Ergebnis versteckt</p>
        <p className="text-muted-foreground text-sm">
          Dieses Match ist das Match of the Week — das Ergebnis bleibt verdeckt,
          damit dir das Video nicht gespoilert wird.
        </p>
        <Button
          type="button"
          variant="outline"
          className="border-brand-orange/50"
          onClick={() => setRevealed(true)}
        >
          Ergebnis anzeigen
        </Button>
      </div>
    </>
  );
}
