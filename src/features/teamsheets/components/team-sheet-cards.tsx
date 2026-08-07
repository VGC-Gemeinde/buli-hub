"use client";

import { useEffect, useState } from "react";
import { Tick } from "@/components/tick";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SheetCard } from "../view";

// The six team cards plus the two controls that need state: the animation
// toggle and the copy button. Everything else about a card was resolved on the
// server — this component only picks which of the two sprite URLs to show.

const ANIMATION_KEY = "teamsheet-animation";

function ItemIcon({ card }: { card: SheetCard }) {
  const icon = card.itemIcon;
  if (!icon) {
    return null;
  }
  const shared =
    "absolute right-0 bottom-0 drop-shadow-[0_1px_2px_oklch(0.2_0.06_264/0.55)]";
  if (icon.kind === "image") {
    return (
      // biome-ignore lint/performance/noImgElement: item renders are external bucket assets, not app images
      <img
        src={icon.url}
        alt=""
        loading="lazy"
        title={card.item ?? undefined}
        className={cn(shared, "size-8 object-contain")}
      />
    );
  }
  // A 24x24 cell of Showdown's item spritesheet.
  return (
    <span
      aria-hidden
      title={card.item ?? undefined}
      className={cn(shared, "size-6 [image-rendering:pixelated]")}
      style={{
        backgroundImage: `url(${icon.url})`,
        backgroundPosition: `${icon.left}px ${icon.top}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

function Card({ card, animate }: { card: SheetCard; animate: boolean }) {
  const src =
    animate && card.sprite.animated ? card.sprite.animated : card.sprite.still;

  return (
    <li className="flex gap-3.5 rounded-xl border bg-card p-4 transition-colors hover:border-brand-orange/50 sm:gap-4">
      <div className="relative flex size-[84px] shrink-0 items-center justify-center">
        {/* biome-ignore lint/performance/noImgElement: sprite renders come from an external bucket as animated webp; next/image would need remote-pattern config and would break the animation */}
        <img
          src={src}
          alt=""
          loading="lazy"
          className="max-h-[84px] max-w-[84px] object-contain"
          style={{
            imageRendering: card.sprite.pixelated ? "pixelated" : "auto",
          }}
        />
        <ItemIcon card={card} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Names and moves are data, so nothing here truncates: "Landorus-
            Therian" and "Bleakwind Storm" are the real strings and must be
            readable in full. Anything that does not fit wraps. The species name
            keeps the heading weight but drops the uppercase treatment — a
            Pokémon name has its own casing, and uppercasing it only made it
            wider. */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-bold font-heading text-[16px] text-brand-blue leading-tight dark:text-white">
            {card.name}
          </span>
          {card.item ? (
            <span className="text-[12.5px] text-muted-foreground">
              @ {card.item}
            </span>
          ) : null}
        </div>

        <div className="text-[13px] leading-snug">
          <span className="text-foreground">{card.ability}</span>
          {card.megaAbility ? (
            <span className="font-semibold text-brand-orange">
              {" "}
              ({card.megaAbility})
            </span>
          ) : null}
        </div>

        <ul className="mt-0.5 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[13px] leading-snug sm:grid-cols-2">
          {card.moves.map((move) => (
            <li
              key={move}
              className="before:mr-1.5 before:text-brand-orange before:content-['▸']"
            >
              {move}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-baseline gap-2 pt-1 text-[12px] text-muted-foreground">
          <span>{card.nature}</span>
          {card.natureEffect ? (
            <span className="font-semibold tabular-nums">
              <span className="text-[oklch(0.6_0.12_158)]">
                +{card.natureEffect.plus}
              </span>
              <span className="ml-1.5 text-[oklch(0.55_0.19_27)]">
                &minus;{card.natureEffect.minus}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function TeamSheetCards({
  cards,
  ots,
}: {
  cards: SheetCard[];
  ots: string;
}) {
  // Animated by default, but the preference sticks: someone reading six sheets
  // in a row should not have to switch it off six times. Read after mount so
  // the server-rendered markup and the first client render agree.
  const [animate, setAnimate] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAnimate(window.localStorage.getItem(ANIMATION_KEY) !== "off");
  }, []);

  const toggleAnimation = (next: boolean) => {
    window.localStorage.setItem(ANIMATION_KEY, next ? "on" : "off");
    setAnimate(next);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(ots);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Only offer the toggle when there is something to animate: a team rendered
  // entirely from CDN fallbacks has no animated variant.
  const animatable = cards.some((card) => card.sprite.animated !== null);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <Tick size="s" />
          <span className="font-semibold text-[12.5px] text-muted-foreground uppercase tracking-[0.12em]">
            Offenes Teamsheet
          </span>
        </div>
        {animatable ? (
          <div
            className="flex items-center gap-2"
            title="Zeigt die Sprites animiert statt als Standbild"
          >
            <Switch
              id="sprite-animation"
              checked={animate}
              onCheckedChange={toggleAnimation}
            />
            <Label
              htmlFor="sprite-animation"
              className="cursor-pointer whitespace-nowrap font-semibold text-[13.5px] text-brand-blue dark:text-white"
            >
              Animation
            </Label>
          </div>
        ) : null}
      </div>

      {/* Two columns, not three. At three the text column is ~184px wide, which
          leaves ~86px per move in a two-up move grid — about six characters.
          Two columns give each move ~170px, so real move names fit on one line. */}
      <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {cards.map((card, index) => (
          <Card
            // Species can repeat in principle; the slot is what identifies a card.
            key={`${card.name}-${index}`}
            card={card}
            animate={animate}
          />
        ))}
      </ul>

      {/* Below the team, because that is the order you use it in: read the six
          mons, then take the export. */}
      <div className="mt-5 flex border-t pt-5">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? "Kopiert" : "Teamsheet kopieren"}
        </Button>
      </div>
    </>
  );
}
