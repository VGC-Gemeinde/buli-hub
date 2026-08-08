import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// The two sanctioned link styles (DESIGN.md §2.7).

// Inline link inside prose: brand-blue, underlined. Used in Legal pages and
// any running text.
export function InlineLink({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "text-brand-blue underline underline-offset-[3px] dark:text-white",
        className,
      )}
      {...props}
    />
  );
}

// Standalone action link: semibold brand-blue with a trailing "→" and hover
// underline ("Zum Spieler-Dashboard →", "Ansehen →"). Renders a Next.js Link
// when `href` is given, otherwise a button for in-place actions.
type ActionLinkProps = {
  href?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function ActionLink({
  href,
  children,
  className,
  onClick,
  type = "button",
  disabled,
}: ActionLinkProps) {
  const classes = cn(
    "group inline-flex items-center gap-1 font-semibold text-brand-blue underline-offset-[3px] hover:underline dark:text-white",
    className,
  );
  const inner = (
    <>
      {children}
      <span
        aria-hidden
        className="transition-transform group-hover:translate-x-0.5"
      >
        →
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {inner}
    </button>
  );
}
