import Link from "next/link";

// Minimal global footer: keeps the legally required Impressum + Datenschutz
// links reachable from every page.
export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t px-6 py-3">
      <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
        <span>© {new Date().getFullYear()} VGC Gemeinde</span>
        <span className="text-border">·</span>
        <Link href="/impressum" className="hover:text-foreground">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-foreground">
          Datenschutz
        </Link>
      </div>
    </footer>
  );
}
