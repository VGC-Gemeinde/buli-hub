import { redirect } from "next/navigation";

// The season dashboard now lives inline on /staff while the season runs; this
// route is kept only to redirect any old links.
export default function StaffSaisonPage() {
  redirect("/staff");
}
