import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaintenancePage } from "@/features/maintenance/components/maintenance-page";
import { maintenanceMode } from "@/features/maintenance/mode";

export const metadata: Metadata = {
  title: "Wartung · Buli Hub",
  robots: { index: false },
};

// Without force-dynamic the route is prerendered and MAINTENANCE is read at
// *build* time (off), so the page would be a permanent 404.
export const dynamic = "force-dynamic";

// Reached only through the proxy's rewrite while maintenance is on
// (contracts/maintenance.md); otherwise there is nothing here.
export default function WartungPage() {
  if (!maintenanceMode()) {
    notFound();
  }
  return <MaintenancePage />;
}
