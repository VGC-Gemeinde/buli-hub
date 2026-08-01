import Link from "next/link";
import { FeedbackFooterLink } from "@/features/feedback/components/feedback-footer-link";
import { RegelwerkFooterLink } from "@/features/regelwerk/components/footer-link";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";

// Minimal global footer: keeps the legally required Impressum + Datenschutz
// links reachable from every page, plus the feedback entry point for signed-in
// users — the header's user menu is the other one, and neither exists for
// visitors, who cannot file a report.
//
// The Regelwerk sits here rather than in HeaderNav: the nav is signed-in only,
// and the rules have to be readable *before* registering.
export async function SiteFooter() {
  const current = await currentUser();

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
        <RegelwerkFooterLink />
        {current ? (
          <FeedbackFooterLink
            canSubmitIdea={roleAtLeast(current.role, "staff")}
          />
        ) : null}
      </div>
    </footer>
  );
}
