import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

// Shared shell for the legal pages (Impressum, Datenschutz): the site header, a
// centered reading column, and prose styling applied to descendant elements so
// the pages themselves stay plain semantic markup.
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link
          href="/"
          className="mb-6 inline-block text-muted-foreground text-sm hover:text-foreground"
        >
          ← Zur Startseite
        </Link>
        <h1 className="mb-8 hyphens-auto text-3xl text-brand-blue leading-[1.1] sm:text-4xl dark:text-white">
          {title}
        </h1>
        <article className="flex flex-col gap-3 text-[14.5px] text-muted-foreground leading-relaxed [&_a]:text-brand-orange [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:mt-7 [&_h2]:mb-1 [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:text-brand-blue [&_h2]:text-lg [&_h2]:uppercase [&_h2]:tracking-[0.02em] dark:[&_h2]:text-white [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-5">
          {children}
        </article>
      </main>
    </div>
  );
}
