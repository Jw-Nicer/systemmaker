import { getAllABTests } from "@/lib/actions/ab-tests";
import ABTestsManager from "./ABTestsManager";

export default async function AdminABTestsPage() {
  const tests = await getAllABTests();

  return <ABTestsManager initialData={tests} />;
}
