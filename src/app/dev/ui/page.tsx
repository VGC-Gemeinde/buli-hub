import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Gallery } from "@/features/dev/components/gallery";

export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <h1 className="text-4xl text-brand-blue dark:text-white">UI-Galerie</h1>
        <Gallery />
      </main>
    </div>
  );
}
