import { cn } from "@/lib/utils";
import type { Icon } from "../view";

// The icon in a ranking or list row: a Pokémon's box icon, an item, a move's
// type, the "no item" glyph, or a placeholder when nothing is known.

export function TypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: small static SVGs from public/, no optimisation to gain
    <img
      src={`/type-icons/${type.toLowerCase()}.svg`}
      alt={type}
      title={type}
      className={cn("size-6 shrink-0", className)}
    />
  );
}

export function StatsIcon({
  icon,
  size = "row",
}: {
  icon: Icon;
  size?: "row" | "small" | "large";
}) {
  const box =
    size === "row" ? "h-[30px] w-10" : size === "small" ? "h-6 w-8" : "size-11";
  switch (icon.kind) {
    case "pokemon":
      return (
        <span className={cn("flex shrink-0 items-center justify-center", box)}>
          {/* biome-ignore lint/performance/noImgElement: box icons come from the external sprite bucket */}
          <img
            src={icon.url}
            alt=""
            loading="lazy"
            className={cn(
              "max-h-full max-w-full object-contain",
              icon.pixelated && "[image-rendering:pixelated]",
            )}
          />
        </span>
      );
    case "item":
      return (
        <span className={cn("flex shrink-0 items-center justify-center", box)}>
          {icon.sprite.kind === "image" ? (
            // biome-ignore lint/performance/noImgElement: item renders come from the external sprite bucket
            <img
              src={icon.sprite.url}
              alt=""
              loading="lazy"
              className={
                size === "row"
                  ? "size-[26px]"
                  : size === "small"
                    ? "size-5"
                    : "size-11"
              }
            />
          ) : (
            <span
              aria-hidden
              className="size-6 [image-rendering:pixelated]"
              style={{
                backgroundImage: `url(${icon.sprite.url})`,
                backgroundPosition: `${icon.sprite.left}px ${icon.sprite.top}px`,
                backgroundRepeat: "no-repeat",
              }}
            />
          )}
        </span>
      );
    case "type":
      return (
        <span className={cn("flex shrink-0 items-center justify-center", box)}>
          <TypeIcon
            type={icon.type}
            className={size === "row" ? "size-6" : "size-[18px]"}
          />
        </span>
      );
    case "none":
      return (
        <span
          className={cn("flex shrink-0 items-center justify-center", box)}
          aria-hidden
        >
          <span className="relative size-[22px] rounded-full border-[1.5px] border-muted-foreground/70 after:absolute after:inset-y-[-2px] after:left-1/2 after:w-[1.5px] after:-translate-x-1/2 after:rotate-45 after:bg-muted-foreground/70" />
        </span>
      );
    case "unknown":
      return (
        <span
          className={cn("flex shrink-0 items-center justify-center", box)}
          aria-hidden
        >
          <span className="flex size-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed font-bold text-[11px] text-muted-foreground">
            ?
          </span>
        </span>
      );
  }
}

export function MegaPill({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center whitespace-nowrap rounded-full border border-brand-orange/55 px-1.5 font-bold text-[10px] text-brand-orange uppercase tracking-[0.08em]",
        className,
      )}
    >
      {label}
    </span>
  );
}
