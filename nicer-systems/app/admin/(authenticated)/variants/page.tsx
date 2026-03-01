import { getAllVariants } from "@/lib/actions/variants";
import VariantsManager from "./VariantsManager";

export default async function AdminVariantsPage() {
  const variants = await getAllVariants();

  return <VariantsManager initialData={variants} />;
}
