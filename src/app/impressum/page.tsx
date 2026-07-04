import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Impressum · Buli Hub",
};

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        VGC Gemeinde
        <br />
        Ansprechpartner: Alexander Kampf
        <br />
        Krafftstr. 8
        <br />
        63065 Offenbach am Main
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail:{" "}
        <a href="mailto:webmaster@vgcgemein.de">webmaster@vgcgemein.de</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Alexander Kampf
        <br />
        Krafftstr. 8
        <br />
        63065 Offenbach am Main
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf
        diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8
        bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet,
        übermittelte oder gespeicherte fremde Informationen zu überwachen oder
        nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
        hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
        Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält gegebenenfalls Links zu externen Websites Dritter,
        auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
        diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
        verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
        Seiten verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als
        solche gekennzeichnet. Pokémon sowie zugehörige Namen und Marken sind
        Eigentum der jeweiligen Rechteinhaber; dieses Projekt steht in keiner
        offiziellen Verbindung zu diesen.
      </p>
    </LegalPage>
  );
}
