import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/section-header";
import { SiteHeader } from "@/components/site-header";
import { currentUser } from "@/features/roles/guard";
import { roleAtLeast } from "@/features/roles/roles";
import {
  UsageBarChart,
  UsageLegend,
} from "@/features/usage/components/usage-bar-chart";
import { UsageCards } from "@/features/usage/components/usage-cards";
import { UsageTable } from "@/features/usage/components/usage-table";
import { readSummary } from "@/features/usage/store";
import { dayBarLabel, summaryMetaLine } from "@/features/usage/summary";

// Usage statistics for admins: how busy the hub is and roughly how many
// people that was (docs/plans/usage-stats.md). Reads aggregates only; nothing
// on this page can be traced to a person.
export const dynamic = "force-dynamic";

export default async function StaffNutzungPage() {
  const current = await currentUser();
  if (!current || !roleAtLeast(current.role, "admin")) {
    redirect("/");
  }

  const summary = await readSummary(new Date());
  const newestFirst = <T,>(rows: readonly T[]): T[] => [...rows].reverse();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        breadcrumb="Nutzung"
        breadcrumbRoot={{ href: "/staff", label: "Staff-Bereich" }}
      />
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 py-12 sm:px-8">
        <h1 className="mb-2 text-[40px] text-brand-blue dark:text-white">
          Nutzung
        </h1>
        <p className="mb-9 text-[13px] text-muted-foreground">
          {summaryMetaLine(summary)}
        </p>

        <div className="flex flex-col gap-10">
          <UsageCards
            cards={[
              { label: "Heute", value: summary.today.visits, unit: "Aufrufe" },
              {
                label: "Heute",
                value: summary.today.uniques,
                unit: "Personen",
              },
              {
                label: "Diese Woche",
                value: summary.week.uniques,
                unit: "Personen",
              },
              {
                label: "Dieser Monat",
                value: summary.month.uniques,
                unit: "Personen",
              },
            ]}
          />

          <section className="flex flex-col gap-4">
            <SectionHeader meta="Aufrufe je Stunde">Heute</SectionHeader>
            <UsageBarChart
              bars={summary.hours.map((hour) => ({
                label: hour.label,
                value: hour.visits,
                counted: hour.counted,
              }))}
              unit="Aufrufe"
              labelEvery={3}
            />
            <UsageLegend />
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeader meta="Aufrufe je Tag">Letzte 30 Tage</SectionHeader>
            <UsageBarChart
              bars={summary.days.map((day) => ({
                label: dayBarLabel(day.id),
                value: day.visits,
                counted: day.counted,
              }))}
              unit="Aufrufe"
              labelEvery={5}
            />
            <UsageLegend />
            <p className="max-w-[720px] text-[13px] text-muted-foreground leading-relaxed">
              Personen sind eine Schätzung, die bei den Größenordnungen der Liga
              praktisch exakt ist. Jeder Zeitraum zählt seine Personen selbst.
              Eine Woche ist deshalb nicht die Summe ihrer Tage: wer zweimal in
              einer Woche vorbeischaut, ist in der Woche eine Person und an
              jedem Tag eine.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeader>Tage</SectionHeader>
            <UsageTable
              periodHeading="Tag"
              rows={newestFirst(summary.days).slice(0, 14)}
            />
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeader>Wochen</SectionHeader>
            <UsageTable
              periodHeading="Woche"
              rows={newestFirst(summary.weeks)}
            />
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeader>Monate</SectionHeader>
            <UsageTable
              periodHeading="Monat"
              rows={newestFirst(summary.months)}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
