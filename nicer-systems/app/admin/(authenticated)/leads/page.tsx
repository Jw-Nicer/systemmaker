import { getAllLeads } from "@/lib/actions/leads";
import LeadsManager from "./LeadsManager";

export default async function AdminLeadsPage() {
  const leads = await getAllLeads();

  return <LeadsManager initialData={leads} />;
}
