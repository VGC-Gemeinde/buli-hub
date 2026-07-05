"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The match page's spoiler cover skeleton (neutral viewers only): back link,
// kicker, pairing headline, and a cover card that swaps for the children —
// the full result summary — on reveal; a „Wieder verdecken" link flips it
// back. Client-side reveal only: a courtesy spoiler tag, not security.
// Shared by the general result cover (default tone) and the Match of the
// Week (orange tone, its own copy, exempt from the global switch).
export function SpoilerCoverShell({
  round,
  groupName,
  seasonLabel,
  playerAName,
  playerBName,
  title,
  copy,
  tone = "default",
  children,
}: {
  round: number;
  groupName: string;
  seasonLabel: string;
  playerAName: string;
  playerBName: string;
  title: string;
  copy: string;
  tone?: "default" | "motw";
  children: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) {
    // The summary renders untouched; the re-cover link sits right-aligned on
    // its top (back-link) row so nothing shifts when it appears.
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setRevealed(false)}
          className="absolute top-0 right-0 font-medium text-[12.5px] text-muted-foreground underline underline-offset-2 hover:text-brand-blue dark:hover:text-white"
        >
          Wieder verdecken
        </button>
        {children}
      </div>
    );
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

      <div
        className={cn(
          "mt-6 flex flex-col items-start gap-3 rounded-xl border px-6 py-5",
          tone === "motw" && "border-brand-orange/40 bg-brand-orange/5",
        )}
      >
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-muted-foreground text-sm">{copy}</p>
        <Button
          type="button"
          variant="outline"
          className={cn(tone === "motw" && "border-brand-orange/50")}
          onClick={() => setRevealed(true)}
        >
          Ergebnis anzeigen
        </Button>
      </div>
    </>
  );
}
