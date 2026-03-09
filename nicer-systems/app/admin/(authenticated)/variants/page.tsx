import { getAllVariants, getVariantAnalytics } from "@/lib/actions/variants";
import VariantsManager from "./VariantsManager";

export default async function AdminVariantsPage() {
  const [variants, analytics] = await Promise.all([
    getAllVariants(),
    getVariantAnalytics(),
  ]);

  return <VariantsManager initialData={variants} analytics={analytics} />;
}
