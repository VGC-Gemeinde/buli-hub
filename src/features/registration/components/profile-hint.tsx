"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { dismissRegistrationHint } from "../actions";

// Nudges players who have not filled in their profile that they can add
// optional info there for their registration. Shown only when the profile has
// neither been edited nor the hint dismissed (decided server-side); dismissing
// hides it immediately and persists so it stays hidden.
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
    <div className="flex items-start gap-3 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-4 py-3">
      <div className="flex-1">
        <p className="text-sm">
          In deinem Profil kannst du optionale Angaben für deine Anmeldung
          machen (z. B. Social-Media-Handles und Herkunft).
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
