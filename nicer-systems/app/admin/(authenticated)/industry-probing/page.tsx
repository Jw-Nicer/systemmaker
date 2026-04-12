import { getAllIndustryProbings } from "@/lib/actions/industry-probing";
import IndustryProbingManager from "./IndustryProbingManager";

export default async function AdminIndustryProbingPage() {
  const items = await getAllIndustryProbings();
  return <IndustryProbingManager initialData={items} />;
}
