import { getAllIndustryPages } from "@/lib/actions/industry-pages";
import IndustryPagesManager from "./IndustryPagesManager";

export default async function AdminIndustryPagesPage() {
  const pages = await getAllIndustryPages();

  return <IndustryPagesManager initialData={pages} />;
}
