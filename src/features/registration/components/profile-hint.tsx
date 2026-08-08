"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { emphasisSurface } from "@/lib/emphasis";
import { cn } from "@/lib/utils";
import { dismissRegistrationHint } from "../actions";

// Nudges players who have not filled in their profile that they can add
// optional info there. Shown on the registration and on the player dashboard
// whenever the profile has neither been edited nor the hint dismissed (decided
// server-side via shouldShowProfileHint); dismissing hides it immediately and
// persists so it stays hidden across both pages.
//
// Styled with the loud emphasisSurface treatment — the same box weight the
// Regelwerk uses for the one rule players kept skimming past. Players ignored
// the muted version, so this deliberately borrows the treatment reserved for
// "this one is not optional", popping equally in light and dark.
export function ProfileHint() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return null;
  }

  function dismiss() {
    setDismissed(true);
    void dismissRegistrationHint();
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg p-5",
        emphasisSurface("orange"),
      )}
    >
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <Tick size="m" color="orange" />
          <span className="font-semibold text-[13px] text-brand-orange uppercase tracking-[0.16em]">
            Profil vervollständigen
          </span>
        </div>
        <p className="text-[16px] text-foreground leading-[1.5]">
          In deinem Profil kannst du optionale Angaben machen, z. B. deine
          Social-Media-Handles und deine Herkunft.
        </p>
        <Link
          href="/profil"
          className="mt-1 inline-block font-medium text-brand-blue text-sm underline dark:text-white"
        >
          Zum Profil
        </Link>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Hinweis ausblenden"
        onClick={dismiss}
        className="-mr-1 -mt-1 size-7 shrink-0"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
