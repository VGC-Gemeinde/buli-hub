import { InlineLink } from "buli-hub";

/* The prose link (DESIGN.md §2.7): brand-blue and underlined, only ever inside
 * running text. It carries the legal pages (/impressum, /datenschutz) and the
 * consent copy under the Discord sign-in, so every cell shows it inside a real
 * sentence rather than standing alone. */

export function InProsa() {
  return (
    <div className="max-w-[560px] text-[15px] leading-relaxed">
      <p>
        Die Anmeldung erfolgt ausschließlich über dein Discord-Konto. Welche
        Daten dabei verarbeitet werden, steht in der{" "}
        <InlineLink href="/datenschutz">Datenschutzerklärung</InlineLink>; bei
        Fragen erreichst du uns unter{" "}
        <InlineLink href="mailto:webmaster@vgcgemein.de">
          webmaster@vgcgemein.de
        </InlineLink>
        .
      </p>
    </div>
  );
}

export function ImHinweis() {
  return (
    <div className="max-w-[560px] rounded-xl border px-5 py-4">
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        Mit der Anmeldung akzeptierst du das{" "}
        <InlineLink href="/regelwerk">Regelwerk der VGC Bundesliga</InlineLink>{" "}
        und die{" "}
        <InlineLink href="/datenschutz">Datenschutzerklärung</InlineLink>. Du
        kannst deine Anmeldung bis zum Saisonstart jederzeit zurückziehen.
      </p>
    </div>
  );
}

export function ImFliesstext() {
  return (
    <div className="flex max-w-[560px] flex-col gap-3 text-[15px] leading-relaxed">
      <h3 className="font-bold font-heading text-[18px] text-brand-blue uppercase tracking-[0.02em] dark:text-white">
        Verantwortlicher
      </h3>
      <p>
        VGC Gemeinde
        <br />
        Alexander Kampf
        <br />
        Krafftstr. 8, 63065 Offenbach am Main, Deutschland
        <br />
        E-Mail:{" "}
        <InlineLink href="mailto:webmaster@vgcgemein.de">
          webmaster@vgcgemein.de
        </InlineLink>
      </p>
      <p className="text-muted-foreground">
        Angaben gemäß § 5 DDG — vollständig im{" "}
        <InlineLink href="/impressum">Impressum</InlineLink>.
      </p>
    </div>
  );
}
