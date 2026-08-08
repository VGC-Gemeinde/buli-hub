import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { InlineLink } from "@/components/links";

export const metadata: Metadata = {
  title: "Datenschutzerklärung · Buli Hub",
};

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <p>Stand: Juli 2026</p>
      <p>
        Diese Datenschutzerklärung informiert über Art, Umfang und Zweck der
        Verarbeitung personenbezogener Daten bei der Nutzung von Buli Hub, der
        Turnierplattform der VGC Bundesliga (im Folgenden "die Plattform").
      </p>

      <h2>1. Verantwortlicher</h2>
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

      <h2>2. Zugriffsdaten / Server-Logfiles</h2>
      <p>
        Beim Aufruf der Plattform werden durch die Hosting-Infrastruktur
        automatisch technische Zugriffsdaten verarbeitet (u. a. IP-Adresse,
        Datum und Uhrzeit des Zugriffs, aufgerufene Seite, übertragene
        Datenmenge, Browsertyp). Diese Verarbeitung dient dem sicheren und
        stabilen Betrieb sowie der Abwehr von Missbrauch. Rechtsgrundlage ist
        das berechtigte Interesse gemäß Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h2>3. Anmeldung über Discord</h2>
      <p>
        Die Anmeldung erfolgt ausschließlich über dein Discord-Konto (OAuth).
        Bei der Anmeldung erhalten wir von Discord deine Discord-ID, deinen
        Benutzernamen, deinen Anzeigenamen und dein Profilbild und speichern
        diese, um dein Konto auf der Plattform zu führen. Zusätzlich rufen wir
        deine Mitgliedschaft und Rollen im Discord-Server der VGC Gemeinde ab,
        um deine Berechtigungen (z. B. Spieler, Staff) zu bestimmen.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Nutzung der Plattform
        auf deine Veranlassung) sowie lit. f DSGVO (Rechte- und
        Rollenverwaltung).
      </p>
      <p>
        Der Anmeldevorgang bindet Discord als Anbieter ein; es gelten insoweit
        auch die Datenschutzhinweise von Discord.
      </p>

      <h2>4. Teilnahme am Spielbetrieb</h2>
      <p>Für die Durchführung der Saison verarbeiten wir:</p>
      <ul>
        <li>
          deine Anmeldeangaben (gewählte Plattform, Selbsteinschätzung deiner
          Spielstärke sowie freiwillige Angaben zu früheren Saisons),
        </li>
        <li>
          deine Einteilung in Divisionen und Gruppen sowie deine Paarungen,
        </li>
        <li>
          gemeldete Ergebnisse, Tabellenstände, Freewins und etwaige
          Anfechtungen von Ergebnissen.
        </li>
      </ul>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Teilnahme an der Liga).
      </p>

      <h2>5. Öffentliche Anzeige</h2>
      <p>
        Während einer laufenden Saison werden Tabellen, Paarungen und
        Ergebnisse, einschließlich deines Anzeigenamens und Profilbilds,
        öffentlich auf der Startseite der Plattform angezeigt. Dies ist für den
        Ligabetrieb und die Transparenz gegenüber der Gemeinschaft erforderlich;
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Wir setzen ausschließlich technisch notwendige Cookies ein, die für die
        Anmeldung und das Aufrechterhalten deiner Sitzung erforderlich sind. Es
        findet kein Tracking und keine Reichweiten- oder Werbeanalyse statt.
      </p>

      <h2>7. Empfänger und Auftragsverarbeiter</h2>
      <p>
        Zur Bereitstellung der Plattform setzen wir Dienstleister ein, die Daten
        in unserem Auftrag verarbeiten:
      </p>
      <ul>
        <li>Supabase (Datenbank, Authentifizierung, Speicher),</li>
        <li>Google Cloud (Hosting der Anwendung),</li>
        <li>Discord (Anmeldung und Identität).</li>
      </ul>
      <p>
        Dabei kann es zu einer Übermittlung in Drittländer (u. a. USA) kommen.
        In diesen Fällen stützen wir die Übermittlung auf geeignete Garantien,
        etwa die Standardvertragsklauseln der EU-Kommission.
      </p>

      <h2>8. Speicherdauer</h2>
      <p>
        Wir speichern personenbezogene Daten, solange dein Konto besteht bzw.
        solange es für den Ligabetrieb erforderlich ist. Danach werden die Daten
        gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten
        entgegenstehen. Ergebnisse und Platzierungen können zu Archivzwecken der
        Liga dauerhaft in anonymisierter oder pseudonymisierter Form erhalten
        bleiben.
      </p>

      <h2>9. Deine Rechte</h2>
      <p>Dir stehen nach der DSGVO folgende Rechte zu:</p>
      <ul>
        <li>Auskunft über die zu dir gespeicherten Daten (Art. 15),</li>
        <li>Berichtigung unrichtiger Daten (Art. 16),</li>
        <li>
          Löschung (Art. 17) und Einschränkung der Verarbeitung (Art. 18),
        </li>
        <li>Datenübertragbarkeit (Art. 20),</li>
        <li>
          Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen
          (Art. 21).
        </li>
      </ul>
      <p>
        Zur Ausübung deiner Rechte genügt eine Nachricht an{" "}
        <InlineLink href="mailto:webmaster@vgcgemein.de">
          webmaster@vgcgemein.de
        </InlineLink>
        .
      </p>

      <h2>10. Beschwerderecht</h2>
      <p>
        Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
        beschweren. Zuständig ist der Hessische Beauftragte für Datenschutz und
        Informationsfreiheit.
      </p>

      <h2>11. Änderungen dieser Erklärung</h2>
      <p>
        Wir passen diese Datenschutzerklärung an, wenn sich die Plattform oder
        die Rechtslage ändert. Es gilt jeweils die hier veröffentlichte Fassung.
      </p>
    </LegalPage>
  );
}
