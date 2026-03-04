import { getLead } from "@/lib/actions/leads";
import { getLeadActivity } from "@/lib/actions/lead-activity";
import { notFound } from "next/navigation";
import LeadDetail from "./LeadDetail";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, activity] = await Promise.all([
    getLead(id),
    getLeadActivity(id),
  ]);

  if (!lead) notFound();

  return <LeadDetail lead={lead} activity={activity} />;
}
