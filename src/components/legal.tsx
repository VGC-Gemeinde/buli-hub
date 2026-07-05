import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

// Shared shell for the legal pages (Impressum, Datenschutz): the site header, a
// centered 760px reading column, and prose styling applied to descendant
// elements so the pages themselves stay plain semantic markup (DESIGN.md §4.11,
// §8.5). No page-specific back link — the header logo and footer cover it.
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-6 py-12 sm:px-8">
        <h1 className="mb-8 hyphens-auto text-[32px] text-brand-blue leading-[1.05] sm:text-[40px] dark:text-white">
          {title}
        </h1>
        <article className="flex flex-col gap-3 text-[14.5px] text-muted-foreground leading-[1.65] [&_h2]:mt-6 [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-[20px] [&_h2]:text-brand-blue [&_h2]:uppercase [&_h2]:tracking-[0.02em] dark:[&_h2]:text-white [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
          {children}
        </article>
      </main>
    </div>
  );
}
