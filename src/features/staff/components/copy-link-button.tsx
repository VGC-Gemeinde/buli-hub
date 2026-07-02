"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — no-op.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="truncate rounded-md bg-muted px-2.5 py-1.5 text-sm">
        {url}
      </code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copy}
        className="shrink-0"
      >
        {copied ? (
          <>
            <Check className="size-4" /> Kopiert
          </>
        ) : (
          <>
            <Copy className="size-4" /> Link kopieren
          </>
        )}
      </Button>
    </div>
  );
}
